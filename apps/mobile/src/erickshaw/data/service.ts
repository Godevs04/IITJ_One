import type { ERickshawService } from '../types';

/**
 * Hardcoded E-Rickshaw service data — placeholder for future Admin Panel integration.
 * Once the backend module ships, replace this with an API-backed implementation.
 * See services/erickshawService.ts for the swappable data-source boundary.
 */
export const ERICKSHAW_SERVICE_DATA: ERickshawService = {
  service: {
    name: 'Campus E-Rickshaw Service',
    operatingHours: '9:00 AM – 8:00 PM',
    description: 'Safe and convenient transportation within the IIT Jodhpur campus.',
    vehicles: [
      { type: 'E-Rickshaw', count: 2 },
      { type: 'Electric Auto', count: 1 },
    ],
  },
  drivers: [
    {
      id: 'driver-001',
      name: 'Motiram',
      phone: '8003302093',
      isVerified: true,
    },
    {
      id: 'driver-002',
      name: 'Nirmal Singh',
      phone: '9001842094',
      isVerified: true,
    },
    {
      id: 'driver-003',
      name: 'Kishan Singh',
      phone: '8239986213',
      isVerified: true,
    },
  ],
  fares: [
    {
      route: 'Hostel ↔ Pedestrian Gate',
      price: 20,
      description: 'per person (shared ride)',
    },
    {
      route: 'Hostel ↔ Pedestrian Gate',
      price: 30,
      description: 'single passenger',
    },
    {
      route: 'Within Campus',
      price: 15,
      description: 'per person',
    },
    {
      route: 'Excess Luggage',
      price: 10,
      description: 'additional charge',
    },
  ],
};
