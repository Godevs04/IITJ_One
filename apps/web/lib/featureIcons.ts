import { UtensilsCrossed, Bus, CalendarDays, Shirt, Wifi, PhoneCall, LayoutGrid, type LucideIcon } from 'lucide-react';
import type { FeatureKey } from './constants';

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  mess: UtensilsCrossed,
  transport: Bus,
  calendar: CalendarDays,
  laundry: Shirt,
  wifi: Wifi,
  emergency: PhoneCall,
  'campus-apps': LayoutGrid,
};
