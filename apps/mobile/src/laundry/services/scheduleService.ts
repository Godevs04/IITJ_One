import { LAUNDRY_SCHEDULES } from '../data/schedules';
import type { Hostel, LaundrySchedule } from '../types';

/**
 * Data-source boundary for laundry schedules. Today this reads the hardcoded
 * list; once the Admin Panel/API ships, replace `laundryScheduleProvider`
 * below with an API-backed implementation (same shape as the campus sync
 * modules) — the UI and notification logic never call LAUNDRY_SCHEDULES
 * directly, so nothing else needs to change.
 */
export interface LaundryScheduleProvider {
  getSchedule(hostel: Hostel): LaundrySchedule | null;
  getAllSchedules(): LaundrySchedule[];
}

class HardcodedLaundryScheduleProvider implements LaundryScheduleProvider {
  getSchedule(hostel: Hostel): LaundrySchedule | null {
    return LAUNDRY_SCHEDULES.find((s) => s.hostel === hostel) ?? null;
  }

  getAllSchedules(): LaundrySchedule[] {
    return LAUNDRY_SCHEDULES;
  }
}

export const laundryScheduleProvider: LaundryScheduleProvider = new HardcodedLaundryScheduleProvider();
