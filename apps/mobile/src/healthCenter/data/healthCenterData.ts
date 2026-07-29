import type { Ionicons } from '@expo/vector-icons';

/**
 * Presentational content with no backend representation (never synced,
 * changes only with an app release). The synced/scraped fields — medical
 * officers, hospitals, contacts, services, address — come from
 * DEFAULT_HEALTH_CENTER_DOC (@iitj1/types), reused directly as the offline
 * fallback rather than duplicated here, so there's one seed, not two.
 */

export interface FacilityItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export const FACILITIES: FacilityItem[] = [
  { icon: 'flask-outline', label: 'Laboratory' },
  { icon: 'medkit-outline', label: 'Pharmacy' },
  { icon: 'body-outline', label: 'Physiotherapy' },
  { icon: 'alert-circle-outline', label: 'Emergency' },
  { icon: 'car-outline', label: 'Ambulance' },
  { icon: 'people-outline', label: 'Medical Officers' },
  { icon: 'heart-outline', label: 'Nursing Staff' },
  { icon: 'bed-outline', label: 'Isolation Rooms' },
];

export const STUDENT_HEALTHCARE_INFO: string[] = [
  'Cashless OPD at PHC',
  'Cashless IPD at Empanelled Hospitals',
  'Sexual & Reproductive Healthcare',
  'Medical Counselling',
  'Health Awareness Programs',
];

export const ABOUT_TEXT =
  'The IIT Jodhpur Health Center provides round-the-clock healthcare services to students, faculty, staff, registered dependents and campus residents. It offers emergency care, specialist consultations, pharmacy services, diagnostics, physiotherapy and ambulance support while coordinating treatment with empanelled hospitals.';
