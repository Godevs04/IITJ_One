import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { validateBody } from '../../middleware/validate';
import { loginBodySchema, refreshBodySchema } from '../../models/schemas';
import { adminLoginRateLimiter } from '../../middleware/rateLimit';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  AuthRequest,
} from '../../middleware/auth';
import { findAdminByEmail } from '../../store';

const router = Router();

router.post(
  '/login',
  adminLoginRateLimiter,
  validateBody(loginBodySchema),
  async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await findAdminByEmail(email);

    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const payload = { sub: admin._id ?? email, email: admin.email, name: admin.name, role: admin.role };
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      admin: { email: admin.email, name: admin.name, role: admin.role },
    });
  },
);

router.post('/refresh', validateBody(refreshBodySchema), (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const payload = verifyRefreshToken(refreshToken);
    const { sub, email, name, role } = payload;
    res.json({
      accessToken: signAccessToken({ sub, email, name, role }),
      refreshToken: signRefreshToken({ sub, email, name, role }),
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;
