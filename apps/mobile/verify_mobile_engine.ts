import { getTripsForToday } from './src/transport/services/ScheduleEngine';
import type { TransportDoc, CalendarDoc, HolidaysDoc } from './src/types/campus';

// Seed mock data matching the source schedule exactly
const mockTransport: TransportDoc = {
  campusId: 'iitj',
  routes: [
    {
      weekday: 'sun-holiday',
      direction: 'departure',
      trips: [
        { bus: 'B1', startTime: '10:00 AM', from: 'Old Mess', endTime: '11:00 AM', to: 'MBM', route: 'Paota → Riktiya Bheruji Circle → MBM', direction: 'departure' },
        { bus: 'B2', startTime: '11:30 AM', from: 'Old Mess', endTime: '12:30 PM', to: 'MBM', route: 'Paota → MBM', direction: 'departure' },
        { bus: 'B1', startTime: '4:45 PM', from: 'Old Mess', endTime: '5:45 PM', to: 'MBM', route: 'Paota → MBM → Riktiya Bheruji Circle', direction: 'departure' },
        { bus: 'B2', startTime: '5:45 PM', from: 'Old Mess', endTime: '6:45 PM', to: 'MBM', route: 'Paota → MBM → Riktiya Bheruji Circle', direction: 'departure' }
      ]
    },
    {
      weekday: 'sun-holiday',
      direction: 'arrival',
      trips: [
        { bus: 'B1', startTime: '1:00 PM', from: 'Gate 1: MBM', endTime: '2:00 PM', to: 'IITJ', route: 'MBM College → Paota → IITJ', direction: 'arrival' },
        { bus: 'B2', startTime: '4:00 PM', from: 'Gate 1: MBM', endTime: '5:00 PM', to: 'IITJ', route: 'MBM → Paota → Mandore → IITJ', direction: 'arrival' },
        { bus: 'B1', startTime: '9:00 PM', from: 'Gate 1: MBM', endTime: '10:00 PM', to: 'IITJ', route: 'MBM → Railway Station → Paota', direction: 'arrival' },
        { bus: 'B2', startTime: '9:00 PM', from: 'Gate 1: MBM', endTime: '10:00 PM', to: 'IITJ', route: '—', direction: 'arrival' }
      ]
    }
  ],
  shuttle: [],
  liveTrackingUrl: null,
  scheduleOverrides: []
};

const mockHolidays: HolidaysDoc = {
  campusId: 'iitj',
  holidays: [
    { id: '1', date: new Date().toISOString().slice(0, 10), name: 'Test Holiday', isActive: true }
  ]
};

const mockCalendar: CalendarDoc = {
  campusId: 'iitj',
  events: []
};

console.log('--- Mobile ScheduleEngine Verification ---');

// Test 1: Holiday evaluation
const holidayTrips = getTripsForToday(mockTransport, mockCalendar, mockHolidays);
const holidayDeps = holidayTrips.filter(t => t.direction === 'departure');
const holidayArrs = holidayTrips.filter(t => t.direction === 'arrival');

console.log(`Holiday Mode Departures: ${holidayDeps.length} (Expected: 4)`);
console.log(`Holiday Mode Arrivals: ${holidayArrs.length} (Expected: 4)`);

if (holidayDeps.length === 4 && holidayArrs.length === 4) {
  console.log('✅ ScheduleEngine Holiday check: PASSED');
} else {
  console.error('❌ ScheduleEngine Holiday check: FAILED');
}
