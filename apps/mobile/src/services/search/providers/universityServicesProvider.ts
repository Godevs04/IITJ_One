import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

const ENTRIES: SearchEntry[] = [
  { id: 'svc-wifi', title: 'Internet & Wi-Fi', subtitle: 'Wi-Fi setup guides', module: 'University Services', icon: 'wifi-outline', keywords: ['internet'], route: '/wifi' },
  { id: 'svc-laundry', title: 'Laundry', subtitle: 'Laundry schedules & reminders', module: 'University Services', icon: 'shirt-outline', route: '/laundry' },
  { id: 'svc-erickshaw', title: 'E-Rickshaw', subtitle: 'On-campus e-rickshaw service', module: 'University Services', icon: 'car-sport-outline', route: '/e-rickshaw' },
  { id: 'svc-cabs', title: 'Cabs & Autos', subtitle: 'Book a cab or auto', module: 'University Services', icon: 'car-outline', route: '/cabs-autos' },
  { id: 'svc-emergency', title: 'Emergency Contacts', subtitle: 'Campus emergency numbers', module: 'University Services', icon: 'alert-circle-outline', route: '/emergency' },
  { id: 'svc-services', title: 'Campus Services', subtitle: 'Student services directory', module: 'University Services', icon: 'construct-outline', keywords: ['student services'], route: '/services' },
  { id: 'svc-qr', title: 'Mess QR', subtitle: 'Your Mess QR pass', module: 'University Services', icon: 'qr-code-outline', keywords: ['qr'], route: '/mess-qr' },
  { id: 'svc-portals', title: 'Essential Portals', subtitle: 'Institute web portals', module: 'University Services', icon: 'link-outline', route: '/portals' },
  { id: 'svc-calendar', title: 'Academic Calendar', subtitle: 'Semester calendar & holidays', module: 'University Services', icon: 'calendar-outline', route: '/calendar' },
];

registerSearchProvider({ id: 'university-services', getEntries: () => ENTRIES });
