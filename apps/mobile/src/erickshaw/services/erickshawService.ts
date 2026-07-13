import { ERICKSHAW_SERVICE_DATA } from '../data/service';
import type { ERickshawService, Driver } from '../types';

/**
 * Data-source boundary for E-Rickshaw service. Today this reads the hardcoded
 * data; once the Admin Panel/API ships, replace this implementation with
 * an API-backed version (same interface shape) — the UI and business logic
 * never call ERICKSHAW_SERVICE_DATA directly, so nothing else needs to change.
 */
export interface ERickshawServiceProvider {
  getService(): ERickshawService;
  getDrivers(): Driver[];
  callDriver(phone: string): void;
}

class HardcodedERickshawServiceProvider implements ERickshawServiceProvider {
  getService(): ERickshawService {
    return ERICKSHAW_SERVICE_DATA;
  }

  getDrivers(): Driver[] {
    return ERICKSHAW_SERVICE_DATA.drivers;
  }

  callDriver(phone: string): void {
    // In a real app, this might log the call or send analytics
    // For now, it's a placeholder for future driver app integration
    console.log(`[E-Rickshaw] User initiated call to ${phone}`);
  }
}

export const erickshawServiceProvider: ERickshawServiceProvider =
  new HardcodedERickshawServiceProvider();
