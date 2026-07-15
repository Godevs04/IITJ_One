import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

const ENTRIES: SearchEntry[] = [
  { id: 'home-timetable', title: 'Timetable', subtitle: 'Your class schedule', module: 'Home', icon: 'calendar-outline', route: '/timetable' },
  { id: 'home-notes', title: 'Notes', subtitle: 'Your saved notes', module: 'Home', icon: 'document-text-outline', route: '/notes' },
  { id: 'home-map', title: 'Campus Map', subtitle: 'Explore campus locations', module: 'Home', icon: 'map-outline', route: '/map' },
  { id: 'home-portals', title: 'Essential Portals', subtitle: 'Quick links to institute portals', module: 'Home', icon: 'link-outline', route: '/portals' },
  { id: 'home-services', title: 'Campus Services', subtitle: 'Services available on campus', module: 'Home', icon: 'construct-outline', route: '/services' },
  { id: 'home-laundry', title: 'Laundry', subtitle: 'Laundry schedule and reminders', module: 'Home', icon: 'shirt-outline', route: '/laundry' },
  { id: 'home-cabs', title: 'Cabs & Autos', subtitle: 'Book a cab or auto', module: 'Home', icon: 'car-outline', route: '/cabs-autos' },
];

registerSearchProvider({ id: 'home', getEntries: () => ENTRIES });
