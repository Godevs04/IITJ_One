import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { validateBody } from '../../middleware/validate';
import { loginBodySchema, refreshBodySchema } from '../../models/schemas';
import { adminLoginRateLimiter } from '../../middleware/rateLimit';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  requireAuth,
  AuthRequest,
} from '../../middleware/auth';
import { findAdminByEmail, bumpAdminTokenVersion, logAudit } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();

router.post(
  '/login',
  adminLoginRateLimiter,
  validateBody(loginBodySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await findAdminByEmail(email);

    if (!admin) {
      await logAudit(email, 'login_failed', 'Invalid credentials (unknown email)');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      await logAudit(email, 'login_failed', 'Invalid credentials (wrong password)');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (admin.active === false) {
      await logAudit(email, 'login_blocked', 'Login attempt on a disabled account');
      res.status(403).json({ error: 'This admin account has been disabled' });
      return;
    }

    await logAudit(email, 'login', 'Admin logged in');

    const payload = {
      sub: admin._id ?? email,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      tokenVersion: admin.tokenVersion ?? 0,
    };
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      admin: { email: admin.email, name: admin.name, role: admin.role },
    });
  }),
);

router.post('/refresh', validateBody(refreshBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const payload = verifyRefreshToken(refreshToken);
    const admin = await findAdminByEmail(payload.email);
    if (!admin || admin.active === false) {
      res.status(401).json({ error: 'Admin no longer exists' });
      return;
    }
    if (payload.tokenVersion !== (admin.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Session revoked — please log in again' });
      return;
    }
    const next = {
      sub: admin._id ?? payload.sub,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      tokenVersion: admin.tokenVersion ?? 0,
    };
    res.json({
      accessToken: signAccessToken(next),
      refreshToken: signRefreshToken(next),
      admin: { email: admin.email, name: admin.name, role: admin.role },
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}));

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await bumpAdminTokenVersion(req.admin!.email);
    await logAudit(req.admin!.email, 'logout', 'Admin logged out');
    res.json({ success: true });
  }),
);

export default router;
