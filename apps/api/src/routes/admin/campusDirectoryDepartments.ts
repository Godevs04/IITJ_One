import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { departmentCreateSchema, departmentUpdateSchema, adminDepartmentsQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { listDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertDepartmentId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid department id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid department id' });
    return false;
  }
  return true;
}

router.get(
  '/',
  validateQuery(adminDepartmentsQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, page, limit, search, active, sort } = (
      req as typeof req & {
        validatedQuery: { campus: string; page: number; limit: number; search?: string; active?: boolean; sort: 'asc' | 'desc' };
      }
    ).validatedQuery;
    const { items, total } = await listDepartments(campus, page, limit, { search, active, sort });
    res.json({ campusId: campus, departments: items, total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(departmentCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const saved = await createDepartment(req.body, req.admin!.email);
    res.status(201).json(saved);
  }),
);

router.put(
  '/:id',
  validateBody(departmentUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertDepartmentId(id, res)) return;
    const saved = await updateDepartment(id, req.body, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json(saved);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertDepartmentId(id, res)) return;
    const ok = await deleteDepartment(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertDepartmentId(id, res)) return;
    const doc = await getDepartmentById(id);
    if (!doc) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
