import type { DayName, HostelId } from '@iitj1/types';
export type { DayName, LaundrySchedule } from '@iitj1/types';
export type Hostel = HostelId;

export interface HostelOption {
  id: Hostel;
  category: 'boys' | 'girls';
}

export const HOSTELS: HostelOption[] = [
  { id: 'B1', category: 'boys' },
  { id: 'B3', category: 'boys' },
  { id: 'B5', category: 'boys' },
  { id: 'G1', category: 'boys' },
  { id: 'G2', category: 'boys' },
  { id: 'G3', category: 'boys' },
  { id: 'G5', category: 'boys' },
  { id: 'G6', category: 'boys' },
  { id: 'O3', category: 'boys' },
  { id: 'O4', category: 'boys' },
  { id: 'Y3', category: 'boys' },
  { id: 'Y4', category: 'boys' },
  { id: 'B2', category: 'girls' },
  { id: 'B4', category: 'girls' },
  { id: 'G4', category: 'girls' },
  { id: 'I2', category: 'girls' },
  { id: 'I3', category: 'girls' },
];

export const REMINDER_OPTIONS: { minutesBefore: number; label: string }[] = [
  { minutesBefore: 10, label: '10 minutes before' },
  { minutesBefore: 20, label: '20 minutes before' },
  { minutesBefore: 30, label: '30 minutes before' },
  { minutesBefore: 45, label: '45 minutes before' },
  { minutesBefore: 60, label: '1 hour before' },
];

export interface LaundryReminder {
  id: string;
  minutesBefore: number;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface LaundryPreferences {
  hostel: Hostel | null;
  reminderEnabled: boolean;
  reminders: LaundryReminder[];
  notificationPermissionStatus: NotificationPermissionStatus;
}

export const DEFAULT_LAUNDRY_PREFERENCES: LaundryPreferences = {
  hostel: null,
  reminderEnabled: false,
  reminders: [{ id: 'default', minutesBefore: 30 }],
  notificationPermissionStatus: 'undetermined',
};

// Keep DayName import used for type-only consumers
export type { DayName as LaundryDayName };
