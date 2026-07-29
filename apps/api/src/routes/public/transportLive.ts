import { Router, Request, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { transportLiveQuerySchema } from '../../models/schemas';
import { asyncHandler } from '../../middleware/asyncHandler';
import { ensureTodaysTrips } from '../../services/tripMaterialization';
import { computeAndPersistBusState } from '../../services/busFusion';
import { getVehicleById } from '../../store';
import { getTimeProvider } from '../../services/timeProvider';

const router = Router();

// Deliberately not cached: staleness here directly breaks the "live" promise,
// and it's a cheap indexed lookup plus an in-memory fusion recompute.
router.get(
  '/',
  validateQuery(transportLiveQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { campus } = (req as Request & { validatedQuery: { campus: string } }).validatedQuery;
    const now = getTimeProvider().now();
    const trips = await ensureTodaysTrips(campus, now);

    const vehicleCache = new Map<string, string | null>();
    const getVehicleDisplayName = async (vehicleId: string | null): Promise<string | null> => {
      if (!vehicleId) return null;
      if (vehicleCache.has(vehicleId)) return vehicleCache.get(vehicleId)!;
      const vehicle = await getVehicleById(vehicleId);
      const name = vehicle?.displayName ?? null;
      vehicleCache.set(vehicleId, name);
      return name;
    };

    const payload = await Promise.all(
      trips.map(async (trip) => {
        const { state } = await computeAndPersistBusState(trip, now);
        const vehicleDisplayName = await getVehicleDisplayName(trip.vehicleId);
        return {
          tripId: trip._id,
          direction: trip.direction,
          scheduledDeparture: trip.scheduledDeparture,
          scheduledArrival: trip.scheduledArrival,
          status: state.status,
          vehicle: trip.vehicleId ? { vehicleId: trip.vehicleId, displayName: vehicleDisplayName } : null,
          busState: {
            latitude: state.latitude,
            longitude: state.longitude,
            confidence: state.confidence,
            contributors: state.contributors,
            positionSource: state.positionSource,
            lastUpdated: state.lastUpdated,
          },
        };
      }),
    );

    res.json({ campusId: campus, trips: payload });
  }),
);

export default router;
