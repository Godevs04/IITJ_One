import { BUS_STOPS } from '@/transport/utils/coordinates';
import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

function getEntries(): SearchEntry[] {
  const stopEntries: SearchEntry[] = Object.values(BUS_STOPS).map((stop) => ({
    id: `transport-stop-${stop.name}`,
    title: stop.name,
    subtitle: stop.description,
    module: 'Transport',
    icon: 'location-outline',
    route: '/(tabs)/transport' as const,
  }));

  const busEntries: SearchEntry[] = ['B1', 'B2'].map((bus) => ({
    id: `transport-bus-${bus}`,
    title: `Bus ${bus}`,
    subtitle: 'Departure & arrival schedule',
    module: 'Transport',
    icon: 'bus-outline',
    keywords: [bus.toLowerCase()],
    route: '/(tabs)/transport' as const,
  }));

  const generalEntries: SearchEntry[] = [
    {
      id: 'transport-next-bus',
      title: 'Next Bus',
      subtitle: 'Upcoming departures and arrivals',
      module: 'Transport',
      icon: 'time-outline',
      route: '/(tabs)/transport' as const,
    },
  ];

  return [...generalEntries, ...stopEntries, ...busEntries];
}

registerSearchProvider({ id: 'transport', getEntries });
