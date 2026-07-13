import { Router, Response } from 'express';
import { validateBody } from '../../middleware/validate';
import { calendarPutSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { putCalendar } from '../../store';
import type { CalendarDoc } from '../../types';

const router = Router();

router.put('/', validateBody(calendarPutSchema), async (req: AuthRequest, res: Response) => {
  await putCalendar(req.body as CalendarDoc, req.admin!.email);
  res.json({ success: true });
});

export default router;
