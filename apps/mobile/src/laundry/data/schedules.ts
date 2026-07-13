import type { LaundrySchedule } from '../types';

/**
 * Hardcoded pending Admin Panel integration — placeholder collection times,
 * to be confirmed and made editable per-hostel once the backend module ships.
 * See services/scheduleService.ts for the swappable data-source boundary.
 */
export const LAUNDRY_SCHEDULES: LaundrySchedule[] = [
  { hostel: 'B1', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'B3', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'B5', collectionDay1: 'tuesday', collectionDay2: 'friday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'G1', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '5:30 PM', location: 'Common Area' },
  { hostel: 'G2', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '5:30 PM', location: 'Common Area' },
  { hostel: 'G3', collectionDay1: 'tuesday', collectionDay2: 'friday', collectionTime: '5:30 PM', location: 'Common Area' },
  { hostel: 'G5', collectionDay1: 'tuesday', collectionDay2: 'friday', collectionTime: '6:00 PM', location: 'Common Area' },
  { hostel: 'G6', collectionDay1: 'wednesday', collectionDay2: 'saturday', collectionTime: '6:00 PM', location: 'Common Area' },
  { hostel: 'O3', collectionDay1: 'wednesday', collectionDay2: 'saturday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'O4', collectionDay1: 'wednesday', collectionDay2: 'saturday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'Y3', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '5:00 PM', location: 'Ground Floor' },
  { hostel: 'Y4', collectionDay1: 'tuesday', collectionDay2: 'friday', collectionTime: '5:00 PM', location: 'Ground Floor' },
  { hostel: 'B2', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'B4', collectionDay1: 'tuesday', collectionDay2: 'friday', collectionTime: '6:00 PM', location: 'Ground Floor' },
  { hostel: 'G4', collectionDay1: 'wednesday', collectionDay2: 'saturday', collectionTime: '6:00 PM', location: 'Common Area' },
  { hostel: 'I2', collectionDay1: 'monday', collectionDay2: 'thursday', collectionTime: '5:30 PM', location: 'Ground Floor' },
  { hostel: 'I3', collectionDay1: 'tuesday', collectionDay2: 'friday', collectionTime: '5:30 PM', location: 'Ground Floor' },
];
