import { UtensilsCrossed, Bus, CalendarDays, Shirt, Wifi, HeartPulse, LayoutGrid, type LucideIcon } from 'lucide-react';
import type { FeatureKey } from './constants';

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  mess: UtensilsCrossed,
  transport: Bus,
  calendar: CalendarDays,
  laundry: Shirt,
  wifi: Wifi,
  'health-center': HeartPulse,
  'campus-apps': LayoutGrid,
};
