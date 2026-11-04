import { UtensilsCrossed, Bus, CalendarDays, Shirt, Wifi, HeartPulse, LayoutGrid, MapPinned, Bike, Bell, CalendarClock, NotebookPen, type LucideIcon } from 'lucide-react';
import type { FeatureKey } from './constants';

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  mess: UtensilsCrossed,
  transport: Bus,
  calendar: CalendarDays,
  laundry: Shirt,
  wifi: Wifi,
  'health-center': HeartPulse,
  'campus-apps': LayoutGrid,
  'campus-directory': MapPinned,
  'e-rickshaw': Bike,
  notices: Bell,
  timetable: CalendarClock,
  notes: NotebookPen,
};
