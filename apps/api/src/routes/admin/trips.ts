import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { adminTripsQuerySchema, assignVehicleSchema, overrideTripStatusSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { getTripsForCampusAndDate, assignVehicleToTrip, updateTripStatus, getVehicleById } from '../../store';
import { ensureTodaysTrips } from '../../services/tripMaterialization';
import { computeAndPersistBusState } from '../../services/busFusion';
import { getSocketIoInstance } from '../../services/rideSocket';
import { getTimeProvider } from '../../services/timeProvider';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { getIstDateString } from '../../utils/istTime';
import { asyncHandler } from '../../middleware/asyncHandler';
import { log } from '../../utils/logger';

const router = Router();

function assertTripId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid trip id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return false;
  }
  return true;
}

router.get(
  '/',
  validateQuery(adminTripsQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, serviceDate } = (
      req as typeof req & { validatedQuery: { campus: string; serviceDate?: string } }
    ).validatedQuery;

    const trips = serviceDate
      ? await getTripsForCampusAndDate(campus, serviceDate)
      : await ensureTodaysTrips(campus, getTimeProvider().now());

    const vehicleCache = new Map<string, string | null>();
    const getVehicleDisplayName = async (vehicleId: string | null): Promise<string | null> => {
      if (!vehicleId) return null;
      if (vehicleCache.has(vehicleId)) return vehicleCache.get(vehicleId)!;
      const vehicle = await getVehicleById(vehicleId);
      const name = vehicle?.displayName ?? null;
      vehicleCache.set(vehicleId, name);
      return name;
    };

    // Reuses the same enrichment pattern as GET /transport/live (public) —
    // admins need the same vehicle-assignment + current-BusState view, just
    // over every trip rather than only today's.
    const enriched = await Promise.all(
      trips.map(async (trip) => {
        const { state } = await computeAndPersistBusState(trip);
        const vehicleDisplayName = await getVehicleDisplayName(trip.vehicleId);
        return {
          ...trip,
          vehicle: trip.vehicleId ? { vehicleId: trip.vehicleId, displayName: vehicleDisplayName } : null,
          busState: state,
        };
      }),
    );

    res.json({ campusId: campus, serviceDate: serviceDate ?? getIstDateString(), trips: enriched });
  }),
);

router.post(
  '/:id/assign-vehicle',
  validateBody(assignVehicleSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertTripId(id, res)) return;

    const { vehicleId } = req.body as { vehicleId: string | null };
    const saved = await assignVehicleToTrip(id, vehicleId);
    if (!saved) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    log.info('vehicle assigned', { tripId: id, vehicleId, adminEmail: req.admin!.email });
    getSocketIoInstance()?.to(`campus:${saved.campusId}`).emit('trip:update', saved);
    res.json(saved);
  }),
);

router.post(
  '/:id/override-status',
  validateBody(overrideTripStatusSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertTripId(id, res)) return;

    const { status } = req.body as { status: string };
    const saved = await updateTripStatus(id, status as never);
    if (!saved) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    log.info('trip overridden', { tripId: id, status, adminEmail: req.admin!.email });
    getSocketIoInstance()?.to(`campus:${saved.campusId}`).emit('trip:update', saved);
    res.json(saved);
  }),
);

export default router;
