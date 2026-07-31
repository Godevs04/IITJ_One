import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { organizationCreateSchema, organizationUpdateSchema, adminOrganizationsQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { listOrganizations, getOrganizationById, createOrganization, updateOrganization, deleteOrganization } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertOrganizationId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid organization id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid organization id' });
    return false;
  }
  return true;
}

router.get(
  '/',
  validateQuery(adminOrganizationsQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, page, limit, search, type, active, sort } = (
      req as typeof req & {
        validatedQuery: {
          campus: string; page: number; limit: number; search?: string; type?: string; active?: boolean; sort: 'asc' | 'desc';
        };
      }
    ).validatedQuery;
    const { items, total } = await listOrganizations(campus, page, limit, { search, type, active, sort });
    res.json({ campusId: campus, organizations: items, total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(organizationCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const saved = await createOrganization(req.body, req.admin!.email);
    res.status(201).json(saved);
  }),
);

router.put(
  '/:id',
  validateBody(organizationUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertOrganizationId(id, res)) return;
    const saved = await updateOrganization(id, req.body, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json(saved);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertOrganizationId(id, res)) return;
    const ok = await deleteOrganization(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertOrganizationId(id, res)) return;
    const doc = await getOrganizationById(id);
    if (!doc) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
