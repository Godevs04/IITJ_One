/**
 * Cab & Auto directory rules (apps/mobile/src/cabs/directoryLogic.ts) — pure, tested here because the mobile app
 * has no unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import { campusDriverSchema, DEFAULT_ERICKSHAW_DOC, type CampusDriver } from '@iitj1/types';
import {
  callLabel,
  capacityLabel,
  dialableNumber,
  driversFor,
  driversFromErickshaw,
  fareBadgeText,
  formatRupees,
  ratingA11y,
  ratingLabel,
} from '../../../mobile/src/cabs/directoryLogic';

const driver = (over: Partial<CampusDriver> = {}): CampusDriver => ({
  id: 'd1',
  name: 'Motiram',
  phoneNumber: '8003302093',
  vehicleType: 'eRickshaw',
  isVerified: true,
  isActive: true,
  serviceArea: 'insideCampus',
  ...over,
});

test('the e-rickshaw service becomes inside-campus drivers without inventing details', () => {
  const drivers = driversFromErickshaw(DEFAULT_ERICKSHAW_DOC);
  assert.strictEqual(drivers.length, 3);
  for (const d of drivers) {
    assert.strictEqual(campusDriverSchema.safeParse(d).success, true);
    assert.deepStrictEqual([d.serviceArea, d.vehicleType], ['insideCampus', 'eRickshaw']);
    assert.strictEqual(d.vehicleNumber, undefined);
    assert.strictEqual(d.passengerCapacity, undefined);
    assert.strictEqual(d.rating, undefined);
  }
  assert.strictEqual(drivers[0].phoneNumber, '8003302093');
});

test('sections hold only active drivers of their own area', () => {
  const all = [driver(), driver({ id: 'd2', serviceArea: 'outsideCampus', vehicleType: 'cab' }), driver({ id: 'd3', isActive: false })];
  assert.deepStrictEqual(driversFor(all, 'insideCampus').map((d) => d.id), ['d1']);
  assert.deepStrictEqual(driversFor(all, 'outsideCampus').map((d) => d.id), ['d2']);
  assert.deepStrictEqual(driversFor([], 'outsideCampus'), []);
});

test('rating and capacity: shown only when supplied', () => {
  assert.strictEqual(ratingLabel(undefined), 'Not Rated');
  assert.strictEqual(ratingLabel(5), '★ 5.0');
  assert.strictEqual(ratingLabel(4.8), '★ 4.8');
  assert.strictEqual(ratingA11y(undefined), 'Not rated');
  assert.strictEqual(ratingA11y(4.1), 'Rated 4.1 out of 5');
  assert.strictEqual(capacityLabel(undefined), null);
  assert.strictEqual(capacityLabel(4), '4 Seats');
  assert.strictEqual(capacityLabel(1), '1 Seat');
});

test('fare badge: an official maximum says MAX FARE, anything else says LISTED FARE', () => {
  const cfg = { serviceArea: 'insideCampus' as const, maximumFare: 20, currency: 'INR' as const, isOfficialMaximum: true, updatedAt: '' };
  assert.strictEqual(fareBadgeText(cfg), 'MAX FARE — ₹20');
  assert.strictEqual(fareBadgeText({ ...cfg, isOfficialMaximum: false }), 'LISTED FARE — ₹20');
  assert.strictEqual(fareBadgeText({ ...cfg, maximumFare: 1200 }), 'MAX FARE — ₹1,200');
});

test('without a fare config the published ride prices are a listed fare; luggage is not a ride', () => {
  assert.strictEqual(fareBadgeText(undefined, DEFAULT_ERICKSHAW_DOC.fares), 'LISTED FARE — ₹15 – ₹30');
  assert.strictEqual(fareBadgeText(undefined, [{ price: 20 }, { price: 20 }]), 'LISTED FARE — ₹20');
  assert.strictEqual(fareBadgeText(undefined, [{ price: 10, description: 'additional charge' }]), null);
  assert.strictEqual(fareBadgeText(undefined, []), null);
  assert.strictEqual(formatRupees(600), '₹600');
});

test('call label uses only supplied details; numbers are validated before dialling', () => {
  assert.strictEqual(callLabel(driver()), 'Call Motiram, E-Rickshaw');
  assert.strictEqual(
    callLabel(driver({ vehicleDescription: 'Blue Auto', vehicleNumber: 'RJ12 C 5432' })),
    'Call Motiram, Blue Auto, vehicle RJ12 C 5432',
  );
  assert.strictEqual(dialableNumber('8003302093'), '8003302093');
  assert.strictEqual(dialableNumber('98 (765) 43210'), '9876543210');
  assert.strictEqual(dialableNumber('call me'), null);
});
