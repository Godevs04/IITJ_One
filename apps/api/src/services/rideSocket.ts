import type { Server, Socket } from 'socket.io';
import { validateGpsUpdate, type GpsRejectReason } from './gpsValidation';
import { recordAcceptedPing, removeContributor, getContributor, computeAndPersistBusState } from './busFusion';
import { getRideSessionBySessionId, touchRideSession, insertGpsPing, getTripById } from '../store';
import { incrementCounter } from './metrics';
import { getRedisClient } from './redisClient';
import { gpsUpdatesTotal, socketEventsTotal, socketReconnectsTotal } from './prometheusMetrics';
import { log } from '../utils/logger';
import type { SessionDoc } from '../types';

// GPS pings travel over Socket.IO only — REST (/ride/start, /ride/stop, both
// already built) owns ride-session lifecycle. This socket layer only joins
// rooms and streams location updates for a session that already exists.
// This in-memory map enforces "1 accepted update per 3s per session" —
// correct for a single-instance deployment (Redis unset). When Redis is
// configured, the same read-then-conditionally-commit timestamp is mirrored
// there too (see getLastAcceptedAt/setLastAcceptedAt below), so a session
// reconnecting to a *different* instance mid-throttle-window still gets
// throttled correctly instead of resetting the window.
const lastAcceptedAtBySession = new Map<string, number>();
const GPS_THROTTLE_MS = 3_000;

function throttleKey(sessionId: string): string {
  return `transport:gps-throttle:${sessionId}`;
}

async function getLastAcceptedAt(sessionId: string): Promise<number | undefined> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(throttleKey(sessionId));
      if (raw != null) return Number(raw);
    } catch (err) {
      log.warn('redis throttle read failed — using local fallback', { sessionId, error: (err as Error).message });
    }
  }
  return lastAcceptedAtBySession.get(sessionId);
}

async function setLastAcceptedAt(sessionId: string, ms: number): Promise<void> {
  lastAcceptedAtBySession.set(sessionId, ms);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(throttleKey(sessionId), String(ms), 'PX', GPS_THROTTLE_MS * 2);
    } catch (err) {
      log.warn('redis throttle write failed', { sessionId, error: (err as Error).message });
    }
  }
}

type SocketRejectReason =
  | 'missing_payload'
  | 'invalid_session'
  | 'unknown_trip'
  | 'campus_mismatch'
  | 'throttled'
  | 'internal_error'
  | GpsRejectReason;

type Ack = (response: { ok: boolean; reason?: SocketRejectReason; [key: string]: unknown }) => void;

interface JoinCampusPayload {
  campusId: string;
}

interface JoinTripPayload {
  sessionId: string;
  tripId: string;
}

interface LeaveTripPayload {
  tripId: string;
}

interface LocationUpdatePayload {
  sessionId: string;
  tripId: string;
  campusId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: string;
}

let ioInstance: Server | null = null;

/** Lets admin routes (e.g. manual trip-status override, built in an earlier phase) broadcast without index.ts having to thread `io` through every module. */
export function getSocketIoInstance(): Server | null {
  return ioInstance;
}

/** Validates {sessionId, tripId} against the existing ride-session store — no JWT, reuses the REST-created session as the sole source of truth. Exported for unit testing. */
export async function validateSession(
  sessionId: unknown,
  tripId: unknown,
): Promise<{ ok: true; session: SessionDoc } | { ok: false; reason: SocketRejectReason }> {
  if (typeof sessionId !== 'string' || !sessionId || typeof tripId !== 'string' || !tripId) {
    return { ok: false, reason: 'missing_payload' };
  }
  const session = await getRideSessionBySessionId(sessionId);
  if (!session || !session.isActive || session.tripId !== tripId) {
    return { ok: false, reason: 'invalid_session' };
  }
  return { ok: true, session };
}

/** Removes the socket's contributor (if any), recomputes BusState, and broadcasts unconditionally — a contributor dropping out is worth an immediate update, not gated behind the normal per-second emit throttle. */
async function cleanupContributor(io: Server, socket: Socket, reason: string): Promise<void> {
  const sessionId = socket.data.sessionId as string | undefined;
  const tripId = socket.data.tripId as string | undefined;
  if (!sessionId || !tripId) return;

  await removeContributor(tripId, sessionId);
  lastAcceptedAtBySession.delete(sessionId);

  const trip = await getTripById(tripId);
  if (trip) {
    const { state } = await computeAndPersistBusState(trip);
    io.to(`trip:${tripId}`).emit('bus:update', state);
  }
  log.info('ride socket contributor removed', { sessionId, tripId, reason });
}

export function registerRideSocketHandlers(io: Server): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    incrementCounter('socket_connections');
    // Socket.IO's connection state recovery (enabled in index.ts) restores a
    // dropped connection's rooms/data automatically within its window — a
    // real, built-in signal for "this is a resumed session," not a guess.
    if (socket.recovered) {
      socketReconnectsTotal.inc();
      log.info('ride socket connection recovered', { socketId: socket.id });
    } else {
      log.info('ride socket connected', { socketId: socket.id });
    }

    socket.on('join:campus', (payload: JoinCampusPayload, ack?: Ack) => {
      const campusId = payload?.campusId;
      if (typeof campusId !== 'string' || !campusId) {
        socketEventsTotal.inc({ event: 'join:campus', result: 'rejected' });
        ack?.({ ok: false, reason: 'missing_payload' });
        return;
      }
      void socket.join(`campus:${campusId}`);
      socketEventsTotal.inc({ event: 'join:campus', result: 'ok' });
      log.info('ride socket joined campus room', { socketId: socket.id, campusId });
      ack?.({ ok: true });
    });

    socket.on('join:trip', async (payload: JoinTripPayload, ack?: Ack) => {
      try {
        const { sessionId, tripId } = payload ?? {};
        const validation = await validateSession(sessionId, tripId);
        if (!validation.ok) {
          log.warn('ride socket join:trip rejected', { socketId: socket.id, reason: validation.reason });
          ack?.({ ok: false, reason: validation.reason });
          return;
        }

        socket.data.sessionId = sessionId;
        socket.data.tripId = tripId;
        await socket.join(`trip:${tripId}`);
        log.info('ride socket joined trip room', { socketId: socket.id, sessionId, tripId });
        ack?.({ ok: true });
      } catch (err) {
        log.error('ride socket join:trip failed', { socketId: socket.id, error: (err as Error).message });
        ack?.({ ok: false, reason: 'internal_error' });
      }
    });

    socket.on('leave:trip', (payload: LeaveTripPayload, ack?: Ack) => {
      const tripId = payload?.tripId;
      if (typeof tripId !== 'string' || !tripId) {
        ack?.({ ok: false, reason: 'missing_payload' });
        return;
      }
      void socket.leave(`trip:${tripId}`);
      log.info('ride socket left trip room', { socketId: socket.id, tripId });
      ack?.({ ok: true });
    });

    socket.on('location:update', async (payload: LocationUpdatePayload, ack?: Ack) => {
      try {
        if (
          !payload ||
          typeof payload.sessionId !== 'string' ||
          typeof payload.tripId !== 'string' ||
          typeof payload.campusId !== 'string' ||
          typeof payload.latitude !== 'number' ||
          typeof payload.longitude !== 'number' ||
          typeof payload.accuracy !== 'number' ||
          typeof payload.timestamp !== 'string'
        ) {
          log.warn('ride socket location:update: missing payload fields', { socketId: socket.id });
          ack?.({ ok: false, reason: 'missing_payload' });
          return;
        }

        const { sessionId, tripId, campusId } = payload;
        const validation = await validateSession(sessionId, tripId);
        if (!validation.ok) {
          log.warn('ride socket location:update rejected', { socketId: socket.id, reason: validation.reason });
          ack?.({ ok: false, reason: validation.reason });
          return;
        }

        const now = new Date();
        const lastAccepted = await getLastAcceptedAt(sessionId);
        if (lastAccepted !== undefined && now.getTime() - lastAccepted < GPS_THROTTLE_MS) {
          // debug, not warn/info — this fires routinely under normal operation
          // (a client sending faster than the 3s window), not a genuine problem.
          log.debug('ride socket location:update throttled', { socketId: socket.id, sessionId });
          gpsUpdatesTotal.inc({ result: 'rejected', reason: 'throttled' });
          ack?.({ ok: false, reason: 'throttled' });
          return;
        }

        const trip = await getTripById(tripId);
        if (!trip) {
          log.warn('ride socket location:update: unknown trip', { socketId: socket.id, tripId });
          ack?.({ ok: false, reason: 'unknown_trip' });
          return;
        }
        if (trip.campusId !== campusId) {
          log.warn('ride socket location:update: campus mismatch', { socketId: socket.id, tripId, campusId });
          ack?.({ ok: false, reason: 'campus_mismatch' });
          return;
        }

        // Read the session's previous accepted point *before* recordAcceptedPing overwrites it.
        const previousContributor = getContributor(tripId, sessionId);
        const previousPing = previousContributor
          ? {
              latitude: previousContributor.latitude,
              longitude: previousContributor.longitude,
              clientTimestamp: previousContributor.timestamp,
            }
          : null;

        const clientTimestamp = new Date(payload.timestamp);
        const validationResult = validateGpsUpdate(
          {
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed,
            heading: payload.heading,
            accuracy: payload.accuracy,
            timestamp: clientTimestamp,
          },
          { trip, previousPing },
          now,
        );

        await insertGpsPing({
          sessionId,
          tripId,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          heading: payload.heading,
          accuracy: payload.accuracy,
          clientTimestamp,
          receivedAt: now,
          accepted: validationResult.ok,
          rejectReason: validationResult.ok ? undefined : validationResult.reason,
        });

        if (!validationResult.ok) {
          incrementCounter('gps_rejected');
          gpsUpdatesTotal.inc({ result: 'rejected', reason: validationResult.reason });
          log.info('ride socket GPS rejected', { socketId: socket.id, sessionId, tripId, reason: validationResult.reason });
          ack?.({ ok: false, reason: validationResult.reason });
          return;
        }

        incrementCounter('gps_accepted');
        gpsUpdatesTotal.inc({ result: 'accepted', reason: 'n/a' });
        await setLastAcceptedAt(sessionId, now.getTime());
        socket.data.sessionId = sessionId;
        socket.data.tripId = tripId;
        await recordAcceptedPing(tripId, sessionId, {
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          timestamp: clientTimestamp,
        });
        await touchRideSession(sessionId, now);
        log.info('ride socket GPS accepted', { socketId: socket.id, sessionId, tripId });

        const { state, shouldEmit } = await computeAndPersistBusState(trip, now);
        if (shouldEmit) {
          io.to(`trip:${tripId}`).emit('bus:update', state);
        }
        ack?.({ ok: true });
      } catch (err) {
        log.error('ride socket location:update failed', { socketId: socket.id, error: (err as Error).message });
        ack?.({ ok: false, reason: 'internal_error' });
      }
    });

    socket.on('disconnect', (reason: string) => {
      incrementCounter('socket_disconnects');
      log.info('ride socket disconnected', { socketId: socket.id, reason });
      void cleanupContributor(io, socket, reason).catch((err) => {
        log.error('ride socket disconnect cleanup failed', { socketId: socket.id, error: (err as Error).message });
      });
    });
  });
}
