import { Router, Response } from 'express';
import { messPricingInputSchema, messPricingUpdateSchema, type MessPricingInput, type MessPricingUpdate } from '@iitj1/types';
import { validateBody, validateQuery } from '../../middleware/validate';
import { campusQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { getMessPricingById } from '../../store';
import {
  createMessPricing,
  getMessPricingOverview,
  setMessPricingActive,
  updateMessPricing,
  type MessPricingResult,
} from '../../services/messPricing';

/**
 * Admin mess pricing. Thin HTTP layer — every rule lives in services/messPricing.ts so the admin UI and
 * (later) AI Admin go through the same validation, audit logging and sync-version bump.
 */
const router = Router();

function assertPricingId(id: string, res: Response): boolean {
  const valid = isDbConnected() ? isStrictObjectId(id) : id.trim().length > 0;
  if (!valid) res.status(400).json({ error: 'Invalid pricing id' });
  return valid;
}

function sendResult(res: Response, result: MessPricingResult, okStatus = 200): void {
  if (result.ok) {
    res.status(okStatus).json(result.doc);
    return;
  }
  switch (result.reason) {
    case 'not_found':
      res.status(404).json({ error: 'Pricing configuration not found' });
      return;
    case 'conflict':
      res.status(409).json({
        error: 'EffectiveDateConflict',
        message: `Another active pricing configuration already starts on ${result.conflictWith.effectiveFrom}. Pick a different date or deactivate that one first.`,
        conflictWith: result.conflictWith,
      });
      return;
    case 'not_editable':
    case 'past_effective_date':
    case 'no_current_price':
      res.status(409).json({ error: result.reason, message: result.message });
      return;
  }
}

type CampusQuery = { validatedQuery: { campus: string } };

router.get(
  '/',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus } = (req as typeof req & CampusQuery).validatedQuery;
    res.json(await getMessPricingOverview(campus));
  }),
);

router.get(
  '/current',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus } = (req as typeof req & CampusQuery).validatedQuery;
    const { campusId, today, current, upcoming } = await getMessPricingOverview(campus);
    res.json({ campusId, today, current, upcoming });
  }),
);

router.get(
  '/history',
  validateQuery(campusQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus } = (req as typeof req & CampusQuery).validatedQuery;
    const { campusId, history } = await getMessPricingOverview(campus);
    res.json({ campusId, history });
  }),
);

router.post(
  '/',
  validateBody(messPricingInputSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    sendResult(res, await createMessPricing(req.body as MessPricingInput, req.admin!.email), 201);
  }),
);

router.put(
  '/:id',
  validateBody(messPricingUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPricingId(id, res)) return;
    sendResult(res, await updateMessPricing(id, req.body as MessPricingUpdate, req.admin!.email));
  }),
);

router.post(
  '/:id/activate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPricingId(id, res)) return;
    sendResult(res, await setMessPricingActive(id, true, req.admin!.email));
  }),
);

router.post(
  '/:id/deactivate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPricingId(id, res)) return;
    sendResult(res, await setMessPricingActive(id, false, req.admin!.email));
  }),
);

// GET /:id last so /current and /history are not shadowed.
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPricingId(id, res)) return;
    const doc = await getMessPricingById(id);
    if (!doc) {
      res.status(404).json({ error: 'Pricing configuration not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
