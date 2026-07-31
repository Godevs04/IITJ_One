import { Router, Response } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate';
import { personCreateSchema, personUpdateSchema, adminPeopleQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { listPeople, getPersonById, createPerson, updatePerson, deletePerson } from '../../store';
import { isDbConnected } from '../../db';
import { isStrictObjectId } from '../../utils/objectId';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

function assertPersonId(id: string, res: Response): boolean {
  if (!isDbConnected()) {
    if (!id.trim()) {
      res.status(400).json({ error: 'Invalid person id' });
      return false;
    }
    return true;
  }
  if (!isStrictObjectId(id)) {
    res.status(400).json({ error: 'Invalid person id' });
    return false;
  }
  return true;
}

router.get(
  '/',
  validateQuery(adminPeopleQuerySchema),
  asyncHandler(async (req, res: Response) => {
    const { campus, page, limit, search, departmentId, active, sort } = (
      req as typeof req & {
        validatedQuery: {
          campus: string; page: number; limit: number; search?: string; departmentId?: string; active?: boolean; sort: 'asc' | 'desc';
        };
      }
    ).validatedQuery;
    const { items, total } = await listPeople(campus, page, limit, { search, departmentId, active, sort });
    res.json({ campusId: campus, people: items, total, page, pageSize: limit });
  }),
);

router.post(
  '/',
  validateBody(personCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const saved = await createPerson(req.body, req.admin!.email);
    res.status(201).json(saved);
  }),
);

router.put(
  '/:id',
  validateBody(personUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPersonId(id, res)) return;
    const saved = await updatePerson(id, req.body, req.admin!.email);
    if (!saved) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    res.json(saved);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPersonId(id, res)) return;
    const ok = await deletePerson(id, req.admin!.email);
    if (!ok) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    res.json({ success: true });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    if (!assertPersonId(id, res)) return;
    const doc = await getPersonById(id);
    if (!doc) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    res.json(doc);
  }),
);

export default router;
