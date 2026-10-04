/**
 * Isolated local API for manual admin/mobile testing — never touches a real database or Firebase.
 *
 *   ISOLATED_ADMIN_EMAIL=… ISOLATED_ADMIN_PASSWORD=… npm run dev:isolated -w @iitj1/api
 *
 * Runs the real /api/v1 routes on the in-memory fallback store (seeded campus data, mess pricing seed)
 * with one local test admin created from the env vars above. Port: ISOLATED_API_PORT (default 6013).
 * The admin panel can point at it with NEXT_PUBLIC_API_URL=http://localhost:<port>; allow its origin with
 * CORS_ORIGIN.
 */
import '../src/tests/helpers/isolatedEnv';
import { startInProcessApi } from '../src/tests/helpers/inProcessApi';
import { upsertAdmin } from '../src/store';
import { config } from '../src/config';
import bcrypt from 'bcrypt';

async function main(): Promise<void> {
  const email = process.env.ISOLATED_ADMIN_EMAIL;
  const password = process.env.ISOLATED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.error('[isolated-api] Set ISOLATED_ADMIN_EMAIL and ISOLATED_ADMIN_PASSWORD (12+ chars).');
    process.exitCode = 1;
    return;
  }
  const port = Number(process.env.ISOLATED_API_PORT ?? 6013);
  const api = await startInProcessApi(port);
  await upsertAdmin({
    email,
    passwordHash: await bcrypt.hash(password, config.bcryptRounds),
    name: 'Isolated Test Admin',
    role: 'superadmin',
    active: true,
    tokenVersion: 0,
  });
  console.log(`[isolated-api] In-memory API (no MongoDB, no Firebase) at ${api.base} — test admin ${email}`);
}

void main();
