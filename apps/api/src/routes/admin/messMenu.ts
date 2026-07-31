import { Router, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { messMenuPutSchema, messMenuQuerySchema, messMenuHistoryQuerySchema, publishBothMessMenusSchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { getMessMenuDraft, saveMessMenuDraft, publishMessMenu, publishBothMessMenus, listMessMenuHistory } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import { readExpectedVersion } from '../../utils/expectedVersion';

const router = Router();

// `validateBody` middleware replaces req.body with the Zod-parsed result, which would
// lose the admin's original pasted JSON before we can store it as history's `rawJson`.
// These two routes parse manually instead, capturing req.body first.

router.put(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const rawJson = req.body;
    const result = messMenuPutSchema.safeParse(rawJson);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }
    const version = await publishMessMenu(result.data, rawJson, req.admin!.email, readExpectedVersion(req));
    res.json({ success: true, version });
  }),
);

router.put(
  '/draft',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = messMenuPutSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }
    await saveMessMenuDraft(result.data, req.admin!.email);
    res.json({ success: true });
  }),
);

router.get(
  '/draft',
  validateQuery(messMenuQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { campus, menuType } = (
      req as AuthRequest & { validatedQuery: { campus: string; menuType: 'veg' | 'non-veg' } }
    ).validatedQuery;
    const draft = await getMessMenuDraft(campus, menuType);
    if (!draft) {
      res.status(404).json({ error: 'No draft saved' });
      return;
    }
    res.json(draft);
  }),
);

router.post(
  '/publish-both',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const rawVeg = req.body?.veg;
    const rawNonVeg = req.body?.nonVeg;
    const result = publishBothMessMenusSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }
    const vegExpected = req.header('x-expected-version-veg');
    const nonVegExpected = req.header('x-expected-version-non-veg');
    const { vegVersion, nonVegVersion } = await publishBothMessMenus(
      { input: result.data.veg, rawJson: rawVeg, expectedVersion: vegExpected ? Number(vegExpected) : undefined },
      { input: result.data.nonVeg, rawJson: rawNonVeg, expectedVersion: nonVegExpected ? Number(nonVegExpected) : undefined },
      req.admin!.email,
    );
    res.json({ success: true, vegVersion, nonVegVersion });
  }),
);

router.get(
  '/history',
  validateQuery(messMenuHistoryQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { campus, menuType, limit } = (
      req as AuthRequest & { validatedQuery: { campus: string; menuType: 'veg' | 'non-veg'; limit: number } }
    ).validatedQuery;
    const history = await listMessMenuHistory(campus, menuType, limit);
    res.json({ campusId: campus, menuType, history });
  }),
);

export default router;
