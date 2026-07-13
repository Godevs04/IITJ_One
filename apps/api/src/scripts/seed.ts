import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { config } from '../config';
import { connectDb, collections, disconnectDb } from '../db';
import { loadMenuFromFiles, loadTransportFromFile } from '../services/parsers';
import { initFallbackStore, getFallbackState } from '../store/fallback';
import type { MetaVersions } from '../types';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultVersions = (): MetaVersions => ({
  menu: 1,
  notices: 1,
  transport: 7,
  calendar: 1,
  portals: 1,
  apps: 1,
  map: 1,
  services: 1,
  emergency: 1,
  about: 1,
});

async function seedMongo(): Promise<void> {
  const campusId = config.campusId;
  const now = new Date();
  const { routes, scheduleOverrides } = loadTransportFromFile(config.docsRoot);
  const menuDays = loadMenuFromFiles(config.docsRoot);
  const fallback = getFallbackState();

  await collections.meta().replaceOne(
    { campusId },
    { campusId, versions: defaultVersions(), updatedAt: now },
    { upsert: true },
  );

  await collections.menus().replaceOne(
    { campusId },
    { campusId, month: '2026-07', days: menuDays },
    { upsert: true },
  );

  await collections.transport().replaceOne(
    { campusId },
    {
      campusId,
      routes,
      shuttle: [],
      liveTrackingUrl: null,
      scheduleOverrides,
    },
    { upsert: true },
  );

  await collections.calendar().replaceOne(
    { campusId },
    fallback.calendar,
    { upsert: true },
  );

  await collections.portals().replaceOne({ campusId }, fallback.portals, { upsert: true });
  await collections.apps().replaceOne({ campusId }, fallback.apps, { upsert: true });
  await collections.mapLocations().replaceOne({ campusId }, fallback.mapLocations, { upsert: true });
  await collections.services().replaceOne({ campusId }, fallback.services, { upsert: true });
  await collections.emergency().replaceOne({ campusId }, fallback.emergency, { upsert: true });
  await collections.about().replaceOne({ campusId }, fallback.about, { upsert: true });

  const existingNotices = await collections.notices().countDocuments({ campusId });
  if (existingNotices === 0) {
    await collections.notices().insertMany(fallback.notices);
  }

  const existingAdmin = await collections.admins().findOne({ email: config.adminBootstrap.email });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(config.adminBootstrap.password, config.bcryptRounds);
    await collections.admins().insertOne({
      email: config.adminBootstrap.email,
      passwordHash,
      name: config.adminBootstrap.name,
      role: 'admin',
    });
    console.log(`[seed] Admin created: ${config.adminBootstrap.email}`);
  } else {
    console.log(`[seed] Admin already exists: ${config.adminBootstrap.email}`);
  }

  console.log('[seed] MongoDB seeded successfully');
}

async function seedFallback(): Promise<void> {
  initFallbackStore();
  const passwordHash = await bcrypt.hash(config.adminBootstrap.password, config.bcryptRounds);
  const { fallbackUpsertAdmin } = await import('../store/fallback');
  fallbackUpsertAdmin({
    email: config.adminBootstrap.email,
    passwordHash,
    name: config.adminBootstrap.name,
    role: 'admin',
  });
  console.log('[seed] Fallback in-memory store seeded (MongoDB unavailable)');
  console.log(`[seed] Admin: ${config.adminBootstrap.email}`);
}

async function main(): Promise<void> {
  console.log('[seed] Starting IITJ1 database seed...');
  initFallbackStore();

  const connected = await connectDb();
  if (connected) {
    await seedMongo();
    await disconnectDb();
  } else {
    await seedFallback();
    console.log('[seed] Start MongoDB and re-run seed to persist data');
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
