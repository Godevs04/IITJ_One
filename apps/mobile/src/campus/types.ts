export type LocationCategory =
  | 'academic'
  | 'department'
  | 'hostel'
  | 'food'
  | 'banking'
  | 'health'
  | 'sports'
  | 'office'
  | 'gate'
  | 'service'
  | 'landmark';

export interface CampusLocation {
  id: string;
  name: string;
  category: LocationCategory;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  plusCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  isFavorite?: boolean;
}

export interface LocationCategory_ {
  id: LocationCategory;
  label: string;
  icon: string;
  emoji: string;
}

export const LOCATION_CATEGORIES: Record<LocationCategory, LocationCategory_> = {
  academic: {
    id: 'academic',
    label: 'Academic Buildings',
    icon: 'school-outline',
    emoji: '🏛',
  },
  department: {
    id: 'department',
    label: 'Departments',
    icon: 'briefcase-outline',
    emoji: '🎓',
  },
  hostel: {
    id: 'hostel',
    label: 'Hostels',
    icon: 'home-outline',
    emoji: '🏠',
  },
  food: {
    id: 'food',
    label: 'Food & Cafés',
    icon: 'restaurant-outline',
    emoji: '🍽',
  },
  banking: {
    id: 'banking',
    label: 'Banking',
    icon: 'card-outline',
    emoji: '🏦',
  },
  health: {
    id: 'health',
    label: 'Health',
    icon: 'medical-outline',
    emoji: '🏥',
  },
  sports: {
    id: 'sports',
    label: 'Sports',
    icon: 'basketball-outline',
    emoji: '⚽',
  },
  office: {
    id: 'office',
    label: 'Administrative Offices',
    icon: 'business-outline',
    emoji: '🏢',
  },
  gate: {
    id: 'gate',
    label: 'Gates',
    icon: 'enter-outline',
    emoji: '🚪',
  },
  service: {
    id: 'service',
    label: 'Campus Services',
    icon: 'car-outline',
    emoji: '🚖',
  },
  landmark: {
    id: 'landmark',
    label: 'Landmarks',
    icon: 'pin-outline',
    emoji: '📍',
  },
};
