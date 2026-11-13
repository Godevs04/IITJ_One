import type { CampaignDoc, OrganizationDoc } from '@iitj1/types';
import { formatClock, localDateKey } from '../reminders/reminderLogic';

/**
 * Events & Clubs rules (Screens 11–13). Pure: no React, no storage.
 *
 * Where the data comes from — both sources already exist in the app and are managed by admins:
 * - Events are published Discover campaigns of type "event". The campaign's start / end date are the event's start /
 *   end, its image is the poster, and its **category names the organising club**.
 * - Clubs are Campus Directory organisations of type "club". An event whose organiser is not in the directory still
 *   gets a club entry (by that name), so every event can show its organiser — nothing is made up beyond what an
 *   admin entered.
 */
export interface ClubItem {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  posterUrl?: string;
  /** Null when the event has no organiser name; such an event has no Follow button. */
  clubId: string | null;
  clubName: string;
  startAt: string;
  endAt?: string;
  venue?: string;
  /** A real URL from the campaign (its external link), if it has one. */
  link?: string;
}

const normaliseName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const slug = (s: string) => normaliseName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function isoOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Club registry: directory clubs first, then organisers that appear only on events. */
export function clubsFrom(organizations: readonly OrganizationDoc[], events: readonly EventItem[]): ClubItem[] {
  const clubs = new Map<string, ClubItem>();
  for (const o of organizations) {
    if (o.type !== 'club' || o.active === false || !o._id) continue;
    clubs.set(normaliseName(o.name), { id: o._id, name: o.name.trim(), description: o.description });
  }
  for (const e of events) {
    if (e.clubId && !clubs.has(normaliseName(e.clubName))) {
      clubs.set(normaliseName(e.clubName), { id: e.clubId, name: e.clubName });
    }
  }
  return [...clubs.values()];
}

/** Published, enabled, not-deleted "event" campaigns as event items, with their organiser resolved to a club id. */
export function eventsFromCampaigns(
  campaigns: readonly CampaignDoc[],
  organizations: readonly OrganizationDoc[],
): EventItem[] {
  const clubIdByName = new Map<string, string>();
  for (const o of organizations) {
    if (o.type === 'club' && o.active !== false && o._id) clubIdByName.set(normaliseName(o.name), o._id);
  }
  const items: EventItem[] = [];
  for (const c of campaigns) {
    if (c.type !== 'event' || c.status !== 'published' || c.isEnabled === false || c.deletedAt) continue;
    const startAt = isoOrNull(c.startDate);
    if (!startAt) continue;
    const organiser = c.category?.trim() ?? '';
    const key = normaliseName(organiser);
    const poster = c.visuals?.imageUrl || c.visuals?.images?.[0] || undefined;
    items.push({
      id: c._id ?? c.trackingId ?? `${slug(c.title)}-${startAt}`,
      title: c.title,
      description: [c.subtitle, c.description].filter(Boolean).join('\n\n'),
      posterUrl: poster,
      clubId: organiser ? clubIdByName.get(key) ?? `name:${slug(organiser)}` : null,
      clubName: organiser || 'Campus event',
      startAt,
      endAt: isoOrNull(c.endDate) ?? undefined,
      link: c.externalLink || undefined,
    });
  }
  return items;
}

/**
 * Upcoming events first (nearest first), then past ones (most recent first) — by the event's own date, never by when
 * it was saved or published. Ties break on title so the order is stable.
 */
export function sortByEventDate<T extends { startAt: string; title: string }>(events: readonly T[], now: Date): T[] {
  const nowMs = now.getTime();
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
  const upcoming = events.filter((e) => new Date(e.startAt).getTime() >= nowMs);
  const past = events.filter((e) => new Date(e.startAt).getTime() < nowMs);
  upcoming.sort((a, b) => a.startAt.localeCompare(b.startAt) || byTitle(a, b));
  past.sort((a, b) => b.startAt.localeCompare(a.startAt) || byTitle(a, b));
  return [...upcoming, ...past];
}

/** Followed clubs first, then the rest; each group alphabetical. */
export function orderClubs(clubs: readonly ClubItem[], followed: ReadonlySet<string>): ClubItem[] {
  const byName = (a: ClubItem, b: ClubItem) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  const mine = clubs.filter((c) => followed.has(c.id)).sort(byName);
  const others = clubs.filter((c) => !followed.has(c.id)).sort(byName);
  return [...mine, ...others];
}

/** Case-insensitive partial match on the club name; an empty query keeps everything. */
export function searchClubs(clubs: readonly ClubItem[], query: string): ClubItem[] {
  const q = normaliseName(query);
  return q ? clubs.filter((c) => normaliseName(c.name).includes(q)) : [...clubs];
}

/** "Thu, 12 Nov · 04:00 PM – 06:00 PM" (the end only when it is on the same day). */
export function formatEventWhen(event: Pick<EventItem, 'startAt' | 'endAt'>): string {
  const start = new Date(event.startAt);
  const day = start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const startMin = start.getHours() * 60 + start.getMinutes();
  const end = event.endAt ? new Date(event.endAt) : null;
  const sameDay = end && localDateKey(end) === localDateKey(start);
  return `${day} · ${formatClock(startMin)}${sameDay ? ` – ${formatClock(end.getHours() * 60 + end.getMinutes())}` : ''}`;
}

/** Share text built only from what the event has. No link is invented: the campaign's own link, if any, is added. */
export function shareText(event: EventItem): string {
  const lines = [event.title, `${event.clubName} · ${formatEventWhen(event)}`];
  if (event.venue) lines.push(`Venue: ${event.venue}`);
  if (event.link) lines.push(event.link);
  return lines.join('\n');
}

/** Params for the New Reminder form: the event's title, date and times. Null for an event that has already started. */
export function reminderParamsFor(event: EventItem, now: Date): Record<string, string> | null {
  const start = new Date(event.startAt);
  if (start.getTime() <= now.getTime()) return null;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const end = event.endAt ? new Date(event.endAt) : null;
  const endMin = end && localDateKey(end) === localDateKey(start) ? end.getHours() * 60 + end.getMinutes() : null;
  return {
    memo: event.title,
    date: localDateKey(start),
    start: String(startMin),
    ...(endMin != null && endMin > startMin ? { end: String(endMin) } : {}),
    sourceType: 'event',
    sourceId: event.id,
  };
}
