import dotenv from 'dotenv';
import path from 'path';
import { connectDb, disconnectDb, isDbConnected } from '../src/db';
import { config } from '../src/config';
import { transportPutSchema } from '../src/models/schemas';
import { loadTransportFromFile } from '../src/services/parsers';
import { getMeta, getTransport, putTransport } from '../src/store';
import type { TransportDoc } from '../src/types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Publishes the regular bus timetable from docs/FinalDoc/IITJ_Transport_Schedule.md
 * (currently the November 2026 schedule from IITJ_Bus_Schedule_App_Database.xlsx).
 *
 * Replaces `routes` and `scheduleOverrides`; keeps the live doc's `shuttle` and
 * `liveTrackingUrl`. Goes through putTransport, so the version bump and audit
 * entry match an admin-panel save.
 */
async function main(): Promise<void> {
  console.log('[seed] Publishing the regular transport timetable...');
  try {
    await connectDb();
    if (!isDbConnected()) {
      throw new Error('MongoDB is not connected — set MONGODB_URI and retry');
    }
    const campusId = config.campusId;
    const { routes, scheduleOverrides } = loadTransportFromFile(config.docsRoot);
    const counts = routes.map((g) => `${g.weekday}/${g.direction}: ${g.trips.length}`);
    if (routes.length !== 4 || routes.some((g) => g.trips.length === 0)) {
      throw new Error(`Timetable doc parsed incompletely (${counts.join(', ') || 'no groups'})`);
    }

    const current = await getTransport(campusId);
    const doc = transportPutSchema.parse({
      campusId,
      routes,
      scheduleOverrides,
      shuttle: current?.shuttle ?? [],
      liveTrackingUrl: current?.liveTrackingUrl ?? null,
    }) as TransportDoc;

    const meta = await getMeta(campusId);
    await putTransport(doc, 'admin@iitjone.in', meta.versions.transport);
    const updated = await getMeta(campusId);
    console.log(`[seed] Transport timetable published (${counts.join(', ')}) — version v${updated.versions.transport}`);
  } catch (err) {
    console.error('[seed] Failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => undefined);
  }
}

void main();
