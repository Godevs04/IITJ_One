import { z } from 'zod';

export const HOSTEL_IDS = [
  'B1',
  'B3',
  'B5',
  'G1',
  'G2',
  'G3',
  'G5',
  'G6',
  'O3',
  'O4',
  'Y3',
  'Y4',
  'B2',
  'B4',
  'G4',
  'I2',
  'I3',
] as const;

export type HostelId = (typeof HOSTEL_IDS)[number];

export const DAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export const laundryScheduleSchema = z.object({
  hostel: z.enum(HOSTEL_IDS),
  collectionDay1: z.enum(DAY_NAMES),
  collectionDay2: z.enum(DAY_NAMES),
  collectionTime: z.string().min(1),
  location: z.string().min(1),
});

export const laundryPutSchema = z.object({
  campusId: z.string().min(1),
  schedules: z.array(laundryScheduleSchema),
});

export type LaundrySchedule = z.infer<typeof laundryScheduleSchema>;
export type LaundryDoc = z.infer<typeof laundryPutSchema>;

/** Default seed used by API fallback and mobile offline merge. */
export const DEFAULT_LAUNDRY_SCHEDULES: LaundrySchedule[] = [
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
