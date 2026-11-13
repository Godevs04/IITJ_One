import type { CampusDriver, ErickshawDoc, ServiceArea, TransportFareConfig, VehicleType } from '@iitj1/types';
import { dialableNumber } from '../phc/phcLogic';

/**
 * Rules for the Cab & Auto directory (Screen 10): turning the data the app has into driver cards, and the
 * wording of fares, capacity and ratings. Pure — and strict about never presenting a field that was not supplied.
 */
export { dialableNumber };

/** The heading line under each section title, as in the wireframe. */
export const SECTION_VEHICLES: Record<ServiceArea, string> = {
  insideCampus: 'Auto / E-Rickshaw',
  outsideCampus: 'Auto / Cab',
};

const TYPE_LABELS: Record<VehicleType, string> = { auto: 'Auto', eRickshaw: 'E-Rickshaw', cab: 'Cab' };

export function vehicleTypeLabel(type: VehicleType): string {
  return TYPE_LABELS[type];
}

/** Material icon per vehicle type — used when there is no vehicle photo. */
export const VEHICLE_ICONS: Record<VehicleType, 'electric-rickshaw' | 'local-taxi' | 'directions-car'> = {
  auto: 'local-taxi',
  eRickshaw: 'electric-rickshaw',
  cab: 'directions-car',
};

/**
 * Inside-campus drivers from the campus e-rickshaw service the app already syncs. That record has a name, number
 * and verification flag only, so the card shows exactly those and the vehicle type.
 */
export function driversFromErickshaw(doc: Pick<ErickshawDoc, 'drivers'>): CampusDriver[] {
  return doc.drivers.map((d) => ({
    id: d.id,
    name: d.name,
    phoneNumber: d.phone,
    vehicleType: 'eRickshaw' as const,
    isVerified: d.isVerified,
    isActive: true,
    serviceArea: 'insideCampus' as const,
  }));
}

export function driversFor(drivers: readonly CampusDriver[], area: ServiceArea): CampusDriver[] {
  return drivers.filter((d) => d.isActive && d.serviceArea === area);
}

/** "₹20" — Indian digit grouping, no decimals unless needed. */
export function formatRupees(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
}

/** "3 Seats" / "1 Seat"; null when the capacity was not supplied. */
export function capacityLabel(capacity: number | undefined): string | null {
  if (capacity == null || capacity <= 0) return null;
  return `${capacity} ${capacity === 1 ? 'Seat' : 'Seats'}`;
}

/** "★ 4.8" or "Not Rated" — never a score the driver does not have. */
export function ratingLabel(rating: number | undefined): string {
  return rating == null ? 'Not Rated' : `★ ${rating.toFixed(1)}`;
}

export function ratingA11y(rating: number | undefined): string {
  return rating == null ? 'Not rated' : `Rated ${rating.toFixed(1)} out of 5`;
}

/** Fare entries as stored by the e-rickshaw service: a route, a price and a note such as "per person". */
interface FareEntry {
  price: number;
  description?: string;
}

/**
 * The badge beside a section's vehicle line. A configured fare wins: "MAX FARE" only when it is an official maximum,
 * otherwise "LISTED FARE". Without a config, the ride prices the service publishes are summarised as a listed fare
 * (surcharges such as luggage are not rides). null when nothing is published — the screen then shows no badge.
 */
export function fareBadgeText(config: TransportFareConfig | undefined, fares: readonly FareEntry[] = []): string | null {
  if (config?.maximumFare != null) {
    return `${config.isOfficialMaximum ? 'MAX FARE' : 'LISTED FARE'} — ${formatRupees(config.maximumFare)}`;
  }
  const rides = fares.filter((f) => !/additional|luggage|extra/i.test(f.description ?? ''));
  if (rides.length === 0) return null;
  const prices = rides.map((f) => f.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high
    ? `LISTED FARE — ${formatRupees(low)}`
    : `LISTED FARE — ${formatRupees(low)} – ${formatRupees(high)}`;
}

/** What a screen reader hears on the call button: who and what, using only supplied details. */
export function callLabel(driver: CampusDriver): string {
  const what = driver.vehicleDescription ?? vehicleTypeLabel(driver.vehicleType);
  return `Call ${driver.name}, ${what}${driver.vehicleNumber ? `, vehicle ${driver.vehicleNumber}` : ''}`;
}
