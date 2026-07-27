import { Router, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { validateBody, validateQuery } from '../../middleware/validate';
import { vehicleCreateSchema, vehicleUpdateSchema, adminVehiclesQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { listVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertVehicleId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid vehicle id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid vehicle id' });
    return false;
  }
  return true;
}

/** Registration has a unique index (db.ts) — surface the conflict as 409, not a generic 500. */
function isDuplicateRegistrationError(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === 11000;
}

router.get(
  '/',
  validateQuery(adminVehiclesQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, page, limit } = (
      req as typeof req & { validatedQuery: { campus: string; page: number; limit: number } }
    ).validatedQuery;
    const { items, total } = await listVehicles(campus, page, limit);
    res.json({ campusId: campus, vehicles: items, total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(vehicleCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const saved = await createVehicle(req.body, req.admin!.email);
      res.status(201).json(saved);
    } catch (err) {
      if (isDuplicateRegistrationError(err)) {
        res.status(409).json({ error: 'A vehicle with this registration already exists' });
        return;
      }
      throw err;
    }
  }),
);

router.put(
  '/:id',
  validateBody(vehicleUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertVehicleId(id, res)) return;

    try {
      const saved = await updateVehicle(id, req.body, req.admin!.email);
      if (!saved) {
        res.status(404).json({ error: 'Vehicle not found' });
        return;
      }
      res.json(saved);
    } catch (err) {
      if (isDuplicateRegistrationError(err)) {
        res.status(409).json({ error: 'A vehicle with this registration already exists' });
        return;
      }
      throw err;
    }
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertVehicleId(id, res)) return;

    const ok = await deleteVehicle(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertVehicleId(id, res)) return;

    const doc = await getVehicleById(id);
    if (!doc) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
