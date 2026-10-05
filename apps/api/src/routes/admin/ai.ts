/**
 * AI Admin endpoints. Mounted behind requireAuth (admin router); additionally limited to AI_ADMIN_ROLES.
 * The browser only ever sends text, option picks and confirmations — never actions or parameters.
 */
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiConfirmInputSchema, aiMessageInputSchema } from '@iitj1/types';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody, validateQuery } from '../../middleware/validate';
import { config } from '../../config';
import {
  AI_ADMIN_ROLES,
  cancelCommand,
  confirmAndExecute,
  getLatestSession,
  getSession,
  handleMessage,
  listHistory,
  startSession,
} from '../../services/ai/orchestrator';

const router = Router();

router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.admin || !AI_ADMIN_ROLES.includes(req.admin.role)) {
    res.status(403).json({ error: 'AI Admin is not available for your role' });
    return;
  }
  next();
});

const admin = (req: AuthRequest) => ({ email: req.admin!.email, role: req.admin!.role });
const campusQuery = z.object({ campus: z.string().min(1).default(config.campusId) });

router.get(
  '/sessions/latest',
  validateQuery(campusQuery),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { campus } = (req as AuthRequest & { validatedQuery: { campus: string } }).validatedQuery;
    res.json({ session: await getLatestSession(admin(req), campus) });
  }),
);

router.post(
  '/sessions',
  validateBody(z.object({ campusId: z.string().min(1).default(config.campusId) }).strict()),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(201).json({ session: await startSession(admin(req), (req.body as { campusId: string }).campusId) });
  }),
);

router.get(
  '/sessions/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const view = await getSession(String(req.params.id), admin(req));
    if (!view) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ session: view });
  }),
);

router.post(
  '/sessions/:id/messages',
  validateBody(aiMessageInputSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const outcome = await handleMessage(String(req.params.id), admin(req), req.body);
    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.json({ session: outcome.view });
  }),
);

router.post(
  '/commands/:id/confirm',
  validateBody(aiConfirmInputSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // The admin UI re-reads the conversation afterwards; the reply is also added to it.
    const result = await confirmAndExecute(String(req.params.id), admin(req), (req.body as { previewToken: string }).previewToken);
    res.status(result.status).json({
      ok: result.ok,
      code: result.code,
      message: result.reply.text,
      command: result.status === 403 ? undefined : result.command,
    });
  }),
);

router.post(
  '/commands/:id/cancel',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await cancelCommand(String(req.params.id), admin(req));
    res.status(result.status).json(result.error ? { error: result.error, command: result.command } : { command: result.command });
  }),
);

router.get(
  '/commands',
  validateQuery(campusQuery.extend({ limit: z.coerce.number().int().min(1).max(50).default(20) })),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { campus, limit } = (req as AuthRequest & { validatedQuery: { campus: string; limit: number } }).validatedQuery;
    res.json({ commands: await listHistory(campus, limit) });
  }),
);

export default router;
