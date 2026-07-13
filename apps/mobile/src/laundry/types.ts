export type Hostel =
  | 'B1'
  | 'B3'
  | 'B5'
  | 'G1'
  | 'G2'
  | 'G3'
  | 'G5'
  | 'G6'
  | 'O3'
  | 'O4'
  | 'Y3'
  | 'Y4'
  | 'B2'
  | 'B4'
  | 'G4'
  | 'I2'
  | 'I3';

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

export type DayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface LaundrySchedule {
  hostel: Hostel;
  collectionDay1: DayName;
  collectionDay2: DayName;
  collectionTime: string;
  location: string;
}

export const REMINDER_OPTIONS: { minutesBefore: number; label: string }[] = [
  { minutesBefore: 10, label: '10 minutes before' },
  { minutesBefore: 20, label: '20 minutes before' },
  { minutesBefore: 30, label: '30 minutes before' },
  { minutesBefore: 45, label: '45 minutes before' },
  { minutesBefore: 60, label: '1 hour before' },
];

// A single reminder is used today, but preferences store a list so a future
// "add another reminder" feature doesn't need a data migration.
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
