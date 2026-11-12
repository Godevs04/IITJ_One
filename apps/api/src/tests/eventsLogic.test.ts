/**
 * Events & Clubs rules (apps/mobile/src/events/eventsLogic.ts) — pure, tested here because the mobile app has no
 * unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import type { CampaignDoc, OrganizationDoc } from '@iitj1/types';
import {
  clubsFrom,
  eventsFromCampaigns,
  formatEventWhen,
  orderClubs,
  reminderParamsFor,
  searchClubs,
  shareText,
  sortByEventDate,
} from '../../../mobile/src/events/eventsLogic';

const NOW = new Date(2026, 10, 12, 10, 0);
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();

const campaign = (over: Partial<CampaignDoc> & { _id: string; title: string }): CampaignDoc =>
  ({
    campusId: 'iitj',
    type: 'event',
    placement: 'discover_feed',
    displayType: 'card',
    status: 'published',
    isEnabled: true,
    category: 'Product Club',
    startDate: at(14, 16),
    endDate: at(14, 18),
    tags: [],
    visuals: { images: [] },
    ...over,
  }) as unknown as CampaignDoc;

const org = (name: string, over: Partial<OrganizationDoc> = {}): OrganizationDoc =>
  ({ _id: `org-${name}`, campusId: 'iitj', name, type: 'club', active: true, createdAt: '', updatedAt: '', ...over }) as unknown as OrganizationDoc;

test('only published, enabled, non-deleted event campaigns become events; the organiser is the category', () => {
  const events = eventsFromCampaigns(
    [
      campaign({ _id: 'a', title: 'Workshop' }),
      campaign({ _id: 'b', title: 'Banner', type: 'banner' }),
      campaign({ _id: 'c', title: 'Draft', status: 'draft' }),
      campaign({ _id: 'd', title: 'Off', isEnabled: false }),
      campaign({ _id: 'e', title: 'Gone', deletedAt: at(1, 1) }),
      campaign({ _id: 'f', title: 'Bad date', startDate: 'not a date' }),
    ],
    [org('Product Club')],
  );
  assert.deepStrictEqual(events.map((e) => e.id), ['a']);
  assert.deepStrictEqual([events[0].clubId, events[0].clubName], ['org-Product Club', 'Product Club']);
});

test('an organiser missing from the directory still gets a stable club; no organiser means no club', () => {
  const [known, unlisted, none] = eventsFromCampaigns(
    [
      campaign({ _id: '1', title: 'A', category: ' product  club ' }),
      campaign({ _id: '2', title: 'B', category: 'Drama Club' }),
      campaign({ _id: '3', title: 'C', category: undefined }),
    ],
    [org('Product Club')],
  );
  assert.strictEqual(known.clubId, 'org-Product Club', 'names match ignoring case and spacing');
  assert.strictEqual(unlisted.clubId, 'name:drama-club');
  assert.deepStrictEqual([none.clubId, none.clubName], [null, 'Campus event']);
});

test('several events from one club share its id, so one follow covers them all', () => {
  const events = eventsFromCampaigns(
    [campaign({ _id: '1', title: 'A' }), campaign({ _id: '2', title: 'B' }), campaign({ _id: '3', title: 'C', startDate: at(14, 9) })],
    [],
  );
  assert.strictEqual(new Set(events.map((e) => e.clubId)).size, 1);
  assert.strictEqual(events.length, 3, 'several events on one day are all kept');
});

test('club registry: directory clubs (active, of type club) plus event-only organisers', () => {
  const events = eventsFromCampaigns([campaign({ _id: '1', title: 'A', category: 'Drama Club' })], []);
  const clubs = clubsFrom(
    [org('Art Club'), org('Old Club', { active: false }), org('Some Dept', { type: 'department' } as Partial<OrganizationDoc>)],
    events,
  );
  assert.deepStrictEqual(clubs.map((c) => c.name).sort(), ['Art Club', 'Drama Club']);
  assert.deepStrictEqual(clubsFrom([], []), []);
});

test('followed clubs come first, each group alphabetical; search is case-insensitive and partial', () => {
  const clubs = ['Science Club', 'art club', 'Cricket Club', 'Drama Club'].map((name, i) => ({ id: `c${i}`, name }));
  const ordered = orderClubs(clubs, new Set(['c3', 'c0']));
  assert.deepStrictEqual(ordered.map((c) => c.name), ['Drama Club', 'Science Club', 'art club', 'Cricket Club']);
  assert.deepStrictEqual(searchClubs(clubs, 'CLUB').length, 4);
  assert.deepStrictEqual(searchClubs(clubs, ' cric ').map((c) => c.name), ['Cricket Club']);
  assert.deepStrictEqual(searchClubs(clubs, 'zzz'), []);
  assert.strictEqual(searchClubs(clubs, '').length, 4);
});

test('events sort by their own date: upcoming nearest first, then past most recent first', () => {
  const e = (title: string, d: number) => ({ title, startAt: at(d, 12) });
  const sorted = sortByEventDate([e('far', 30), e('old', 1), e('soon', 13), e('older', 0), e('mid', 20)].map((x) => x), NOW);
  assert.deepStrictEqual(sorted.map((x) => x.title), ['soon', 'mid', 'far', 'old', 'older']);
});

test('formatting and sharing use only what the event has', () => {
  const [ev] = eventsFromCampaigns([campaign({ _id: '1', title: 'Craft Workshop', externalLink: 'https://example.org/e/1' })], []);
  assert.match(formatEventWhen(ev), /04:00 PM – 06:00 PM/);
  assert.strictEqual(shareText(ev).split('\n')[0], 'Craft Workshop');
  assert.ok(shareText(ev).includes('https://example.org/e/1'));
  const [bare] = eventsFromCampaigns([campaign({ _id: '2', title: 'No link' })], []);
  assert.ok(!/https?:/.test(shareText(bare)), 'no link is invented');
});

test('reminder params prefill title, date and times; an event that has started gets none', () => {
  const [ev] = eventsFromCampaigns([campaign({ _id: 'ev1', title: 'Craft Workshop' })], []);
  const p = reminderParamsFor(ev, NOW);
  assert.deepStrictEqual(p, { memo: 'Craft Workshop', date: '2026-11-14', start: String(16 * 60), end: String(18 * 60), sourceType: 'event', sourceId: 'ev1' });
  assert.strictEqual(reminderParamsFor(ev, new Date(2026, 10, 14, 16, 30)), null);
  const [multi] = eventsFromCampaigns([campaign({ _id: 'm', title: 'Fest', endDate: at(16, 18) })], []);
  assert.strictEqual(reminderParamsFor(multi, NOW)?.end, undefined, 'an end on another day is not a same-day end time');
});
