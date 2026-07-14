import {
  DEFAULT_ERICKSHAW_DOC,
  type ErickshawDoc,
  type ErickshawDriver,
} from '@iitj1/types';
import { readCachedModule } from '@/services/sync';
import type { ERickshawService, Driver } from '../types';

/**
 * Prefer synced erickshaw module; fall back to shared defaults offline.
 */
export interface ERickshawServiceProvider {
  getService(): ERickshawService;
  getDrivers(): Driver[];
  callDriver(phone: string): void;
}

function asService(doc: Omit<ErickshawDoc, 'campusId'> | ErickshawDoc): ERickshawService {
  return {
    service: doc.service,
    drivers: doc.drivers as Driver[],
    fares: doc.fares,
  };
}

class SyncedERickshawServiceProvider implements ERickshawServiceProvider {
  private doc(): ERickshawService {
    const cached = readCachedModule<ErickshawDoc>('erickshaw');
    if (cached?.service && cached.drivers && cached.fares) {
      return asService(cached);
    }
    return asService(DEFAULT_ERICKSHAW_DOC);
  }

  getService(): ERickshawService {
    return this.doc();
  }

  getDrivers(): Driver[] {
    return this.doc().drivers;
  }

  callDriver(phone: string): void {
    console.log(`[E-Rickshaw] User initiated call to ${phone}`);
  }
}

export const erickshawServiceProvider: ERickshawServiceProvider =
  new SyncedERickshawServiceProvider();

export type { ErickshawDriver };
