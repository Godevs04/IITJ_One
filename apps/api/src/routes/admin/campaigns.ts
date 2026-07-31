import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { campaignCreateSchema, campaignUpdateSchema, adminCampaignsQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { listCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign, restoreCampaign } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertCampaignId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid campaign id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid campaign id' });
    return false;
  }
  return true;
}

router.get(
  '/',
  validateQuery(adminCampaignsQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, page, limit, search, type, placement, status, effectiveStatus, featured, isEnabled, sort } = (
      req as typeof req & {
        validatedQuery: {
          campus: string; page: number; limit: number; search?: string; type?: string; placement?: string;
          status?: string; effectiveStatus?: 'draft' | 'published' | 'expired' | 'paused' | 'archived';
          featured?: boolean; isEnabled?: boolean; sort: 'asc' | 'desc';
        };
      }
    ).validatedQuery;
    const { items, total } = await listCampaigns(campus, page, limit, {
      search, type, placement, status, effectiveStatus, featured, isEnabled, sort,
    });
    res.json({ campusId: campus, campaigns: items, total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(campaignCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const saved = await createCampaign(req.body, req.admin!.email);
    res.status(201).json(saved);
  }),
);

router.put(
  '/:id',
  validateBody(campaignUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertCampaignId(id, res)) return;
    const saved = await updateCampaign(id, req.body, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(saved);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertCampaignId(id, res)) return;
    const ok = await deleteCampaign(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.post(
  '/:id/restore',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertCampaignId(id, res)) return;
    const saved = await restoreCampaign(id, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Campaign not found or not deleted' });
      return;
    }
    res.json(saved);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertCampaignId(id, res)) return;
    const doc = await getCampaignById(id);
    if (!doc) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
