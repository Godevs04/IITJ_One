import { DEFAULT_LAUNDRY_SCHEDULES, type HostelId, type LaundrySchedule } from '@iitj1/types';
import { readCachedModule } from '@/services/sync';
import type { LaundryDoc } from '@/types/campus';

/**
 * Prefer synced laundry module; fall back to shared defaults offline.
 */
export interface LaundryScheduleProvider {
  getSchedule(hostel: HostelId): LaundrySchedule | null;
  getAllSchedules(): LaundrySchedule[];
}

class SyncedLaundryScheduleProvider implements LaundryScheduleProvider {
  private schedules(): LaundrySchedule[] {
    const doc = readCachedModule<LaundryDoc>('laundry');
    if (doc?.schedules?.length) return doc.schedules as LaundrySchedule[];
    return [...DEFAULT_LAUNDRY_SCHEDULES];
  }

  getSchedule(hostel: HostelId): LaundrySchedule | null {
    return this.schedules().find((s) => s.hostel === hostel) ?? null;
  }

  getAllSchedules(): LaundrySchedule[] {
    return this.schedules();
  }
}

export const laundryScheduleProvider: LaundryScheduleProvider =
  new SyncedLaundryScheduleProvider();
