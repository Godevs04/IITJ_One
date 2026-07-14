import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { validateBody } from '../../middleware/validate';
import { adminCreateSchema, adminUpdateSchema } from '../../models/schemas';
import { AuthRequest, requireRole } from '../../middleware/auth';
import { config } from '../../config';
import { findAdminByEmail, getAdmins, upsertAdmin, setAdminActive } from '../../store';
import { asyncHandler } from '../../middleware/asyncHandler';
import type { AdminDoc } from '../../types';

const router = Router();

router.use(requireRole('superadmin'));

function toSafeAdmin(admin: AdminDoc) {
  return {
    email: admin.email,
    name: admin.name,
    role: admin.role,
    active: admin.active ?? true,
  };
}

router.get(
  '/',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const admins = await getAdmins();
    res.json({ admins: admins.map(toSafeAdmin) });
  }),
);

router.post(
  '/',
  validateBody(adminCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, name, role } = req.body as {
      email: string;
      password: string;
      name: string;
      role: 'admin' | 'superadmin';
    };

    const existing = await findAdminByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An admin with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const admin: AdminDoc = { email, passwordHash, name, role, active: true, tokenVersion: 0 };
    await upsertAdmin(admin);
    res.status(201).json(toSafeAdmin(admin));
  }),
);

router.patch(
  '/:email',
  validateBody(adminUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const targetEmail = String(req.params.email);
    const { active } = req.body as { active: boolean };

    if (targetEmail === req.admin!.email && !active) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    const updated = await setAdminActive(targetEmail, active);
    if (!updated) {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }
    res.json(toSafeAdmin(updated));
  }),
);

export default router;
