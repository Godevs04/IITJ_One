/**
 * Mess pricing migration — seeds the prices the app used to hard-code as the first database pricing
 * configuration, so the database becomes the source of truth.
 *
 *   npm run mess-pricing:seed -w @iitj1/api                                   # DRY RUN (default) — no writes
 *   npm run mess-pricing:seed -w @iitj1/api -- --apply --i-have-reviewed-the-dry-run
 *
 * Idempotent: does nothing when the campus already has any pricing configuration. Writes go through the
 * shared service (services/messPricing.ts), so the seed is validated and audit-logged like an admin edit.
 * --apply writes to the MongoDB configured in apps/api/.env — only run it after approval.
 */
import dotenv from 'dotenv';
import path from 'path';
import { DEFAULT_MESS_PRICING } from '@iitj1/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATOR = 'system@mess-pricing-migration';

async function main(): Promise<void> {
  // Imported after dotenv so config picks up apps/api/.env.
  const { config } = await import('../src/config');
  const { connectDb, disconnectDb, isDbConnected } = await import('../src/db');
  const { listMessPricing } = await import('../src/store');
  const { createMessPricing } = await import('../src/services/messPricing');

  const apply = process.argv.includes('--apply');
  const confirmed = process.argv.includes('--i-have-reviewed-the-dry-run');
  const campusId = config.campusId;
  const seed = { ...DEFAULT_MESS_PRICING, campusId };

  console.log(`[mess-pricing] Seed configuration for campus "${campusId}":`);
  console.log(JSON.stringify(seed, null, 2));

  if (!apply) {
    console.log('[mess-pricing] DRY RUN — nothing was written. Re-run with --apply --i-have-reviewed-the-dry-run after approval.');
    return;
  }
  if (!confirmed) {
    console.error('[mess-pricing] --apply writes to the configured MongoDB. Add --i-have-reviewed-the-dry-run to confirm.');
    process.exitCode = 1;
    return;
  }

  try {
    await connectDb();
    if (!isDbConnected()) throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    const existing = await listMessPricing(campusId);
    if (existing.length > 0) {
      console.log(`[mess-pricing] ${existing.length} configuration(s) already exist — nothing to seed.`);
      return;
    }
    const result = await createMessPricing(seed, MIGRATOR);
    if (!result.ok) throw new Error(`Seed rejected: ${result.reason}`);
    console.log(`[mess-pricing] Seeded configuration ${result.doc._id} (effective ${result.doc.effectiveFrom}).`);
  } catch (err) {
    console.error('[mess-pricing] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
