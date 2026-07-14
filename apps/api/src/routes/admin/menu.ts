import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { menuPutSchema, menuImportSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putMenu } from '../../store';
import { parseMenuCsv } from '../../services/parsers';
import type { MenuDoc } from '../../types';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.put('/', validateBody(menuPutSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body as MenuDoc;
  await putMenu(body, req.admin!.email);
  res.json({ success: true });
}));

router.post('/import', validateBody(menuImportSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { campusId, month, vegCsv, nonVegCsv } = req.body as {
    campusId: string;
    month: string;
    vegCsv: string;
    nonVegCsv: string;
  };
  const days = parseMenuCsv(vegCsv, nonVegCsv, month);
  const doc: MenuDoc = { campusId, month, days };
  await putMenu(doc, req.admin!.email);
  res.json({ success: true, daysImported: days.length });
}));

export default router;
