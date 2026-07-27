import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { rideStartBodySchema, rideStopBodySchema } from '../../models/schemas';
import { rideStartRateLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../middleware/asyncHandler';
import { assignTripForRideStart } from '../../services/tripAssignment';
import { removeContributor, computeAndPersistBusState } from '../../services/busFusion';
import { getSocketIoInstance } from '../../services/rideSocket';
import { getTimeProvider } from '../../services/timeProvider';
import { incrementCounter } from '../../services/metrics';
import { createRideSession, endRideSession, getRideSessionBySessionId, getTripById, getVehicleById } from '../../store';
import { log } from '../../utils/logger';

const router = Router();

// Must match the Socket.IO server's own configuration in index.ts — that
// file owns the real server instance and is out of scope for this phase
// ("no Socket.IO changes"), so these are documented here as the contract
// clients need in order to connect after this call returns.
const SOCKET_NAMESPACE = '/';
const SOCKET_PATH = '/api/v1/socket.io';

// REST owns ride-session lifecycle exclusively — the socket layer
// (services/rideSocket.ts) only validates a session that already exists
// here and streams `location:update`/`bus:update` for it.
router.post(
  '/start',
  rideStartRateLimiter,
  validateBody(rideStartBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campusId, direction, latitude, longitude } = req.body as {
      campusId: string;
      direction: 'departure' | 'arrival';
      latitude: number;
      longitude: number;
    };

    const assignment = await assignTripForRideStart({ campusId, direction, latitude, longitude, at: getTimeProvider().now() });
    if (!assignment.ok) {
      log.info('ride start: no matching trip', { campusId, direction });
      res.status(404).json({ error: 'no_matching_trip' });
      return;
    }

    const sessionId = randomUUID();
    const tripId = String(assignment.trip._id);
    await createRideSession(sessionId, tripId);
    incrementCounter('ride_sessions_started');
    log.info('ride started', { sessionId, tripId, campusId, direction });

    const vehicle = assignment.trip.vehicleId ? await getVehicleById(assignment.trip.vehicleId) : null;
    res.status(201).json({
      sessionId,
      tripId: assignment.trip._id,
      trip: {
        direction: assignment.trip.direction,
        scheduledDeparture: assignment.trip.scheduledDeparture,
        scheduledArrival: assignment.trip.scheduledArrival,
        vehicleDisplayName: vehicle?.displayName ?? null,
      },
      socketNamespace: SOCKET_NAMESPACE,
      socketPath: SOCKET_PATH,
    });
  }),
);

router.post(
  '/stop',
  validateBody(rideStopBodySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.body as { sessionId: string };
    const session = await getRideSessionBySessionId(sessionId);
    if (!session) {
      res.status(404).json({ error: 'session_not_found' });
      return;
    }

    await endRideSession(sessionId);
    await removeContributor(session.tripId, sessionId);
    incrementCounter('ride_sessions_ended');
    log.info('ride stopped', { sessionId, tripId: session.tripId });

    // Mirror the socket disconnect handler's behavior: a contributor leaving
    // (whether by socket drop or explicit REST stop) should refresh BusState
    // and notify anyone still watching this trip, not wait for the next
    // location:update or GET /transport/live poll.
    const trip = await getTripById(session.tripId);
    if (trip) {
      const { state } = await computeAndPersistBusState(trip);
      getSocketIoInstance()?.to(`trip:${session.tripId}`).emit('bus:update', state);
    }

    res.json({ success: true });
  }),
);

export default router;
