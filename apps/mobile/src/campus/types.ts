import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

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

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

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
  icon: IoniconName;
}

export const LOCATION_CATEGORIES: Record<LocationCategory, LocationCategory_> = {
  academic: {
    id: 'academic',
    label: 'Academic Buildings',
    icon: 'school-outline',
  },
  department: {
    id: 'department',
    label: 'Departments',
    icon: 'briefcase-outline',
  },
  hostel: {
    id: 'hostel',
    label: 'Hostels',
    icon: 'home-outline',
  },
  food: {
    id: 'food',
    label: 'Food & Cafés',
    icon: 'restaurant-outline',
  },
  banking: {
    id: 'banking',
    label: 'Banking',
    icon: 'card-outline',
  },
  health: {
    id: 'health',
    label: 'Health',
    icon: 'medical-outline',
  },
  sports: {
    id: 'sports',
    label: 'Sports',
    icon: 'basketball-outline',
  },
  office: {
    id: 'office',
    label: 'Administrative Offices',
    icon: 'business-outline',
  },
  gate: {
    id: 'gate',
    label: 'Gates',
    icon: 'enter-outline',
  },
  service: {
    id: 'service',
    label: 'Campus Services',
    icon: 'car-outline',
  },
  landmark: {
    id: 'landmark',
    label: 'Landmarks',
    icon: 'pin-outline',
  },
};
