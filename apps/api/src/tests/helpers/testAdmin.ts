import { randomUUID, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { config } from '../../config';
import { upsertAdmin } from '../../store';
import type { AdminDoc } from '../../types';

/**
 * Bootstraps a fresh, test-owned admin account with a randomly-generated
 * password — tests must never depend on the documented seed admin's fixed
 * password (`change-me-on-first-login`), since that's real, shared,
 * environment-specific credential state that can legitimately be rotated at
 * any time. A unique email per call also means concurrent/repeated test
 * runs never collide or interfere with each other's token state
 * (tokenVersion bumps, active/inactive toggles, etc.).
 */
export async function bootstrapTestAdmin(
  role: AdminDoc['role'] = 'superadmin',
): Promise<{ email: string; password: string }> {
  const email = `rc-test-admin+${randomUUID()}@example.com`;
  const password = randomBytes(18).toString('base64url');
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const admin: AdminDoc = {
    email,
    passwordHash,
    name: 'RC Test Admin',
    role,
    active: true,
    tokenVersion: 0,
  };
  await upsertAdmin(admin);

  return { email, password };
}
