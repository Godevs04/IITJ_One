import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

const ENTRIES: SearchEntry[] = [
  { id: 'settings-theme', title: 'Theme', subtitle: 'Light or dark appearance', module: 'Settings', icon: 'color-palette-outline', route: '/settings' },
  { id: 'settings-notifications', title: 'Notifications', subtitle: 'Notice & push preferences', module: 'Settings', icon: 'notifications-outline', route: '/settings' },
  { id: 'settings-preferences', title: 'Preferences', subtitle: 'General app preferences', module: 'Settings', icon: 'options-outline', route: '/settings' },
];

registerSearchProvider({ id: 'settings', getEntries: () => ENTRIES });
