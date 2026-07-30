import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { roleCreateSchema, roleUpdateSchema, adminRolesQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { listRoles, getRoleById, createRole, updateRole, deleteRole } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertRoleId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid role id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid role id' });
    return false;
  }
  return true;
}

router.get(
  '/',
  validateQuery(adminRolesQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, page, limit, search, personId, organizationId, category, active, sort } = (
      req as typeof req & {
        validatedQuery: {
          campus: string; page: number; limit: number; search?: string; personId?: string;
          organizationId?: string; category?: string; active?: boolean; sort: 'asc' | 'desc';
        };
      }
    ).validatedQuery;
    const { items, total } = await listRoles(campus, page, limit, { search, personId, organizationId, category, active, sort });
    res.json({ campusId: campus, roles: items, total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(roleCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const saved = await createRole(req.body, req.admin!.email);
    res.status(201).json(saved);
  }),
);

router.put(
  '/:id',
  validateBody(roleUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertRoleId(id, res)) return;
    const saved = await updateRole(id, req.body, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    res.json(saved);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertRoleId(id, res)) return;
    const ok = await deleteRole(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertRoleId(id, res)) return;
    const doc = await getRoleById(id);
    if (!doc) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
