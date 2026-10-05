/**
 * Read-only answers for AI Admin ("What buses run tomorrow?"). Kept apart from mutations: these never
 * create a command, never need confirmation, and are answered from current data by the backend — the data
 * is not sent to the language model.
 */
import { MESS_PRICING_MEALS, resolveMessPricingForDate, upcomingMessPricing, type AiParamValue, type AiQueryName, type MessPricingConfig } from '@iitj1/types';
import { getHolidays, getNotices, getTransportAlerts, listMessPricing } from '../../store';
import { previewTripsForDate } from '../transportExceptions';
import { formatShortDate, normalizeDate, rupees } from './normalize';

const MEAL = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' } as const;

function messAnswer(c: MessPricingConfig, params: Record<string, AiParamValue>): string {
  type Diet = 'veg' | 'nonVeg';
  const diet: Diet | null = params.diet === 'veg' || params.diet === 'nonVeg' ? (params.diet as Diet) : null;
  const meal = typeof params.meal === 'string' && params.meal in MEAL ? (params.meal as keyof typeof MEAL) : null;
  const label = (d: Diet) => (d === 'veg' ? 'Veg' : 'Non-veg');
  const lines: string[] = [];
  if (params.plan !== 'pay_and_use') {
    const ds: Diet[] = diet ? [diet] : ['veg', 'nonVeg'];
    lines.push(`Regular plan (per day): ${ds.map((d) => `${label(d)} ${rupees(c.regular[d])}`).join(', ')} + ${c.regularGstPercent}% GST`);
  }
  if (params.plan !== 'regular') {
    const meals = meal ? [meal] : MESS_PRICING_MEALS;
    const ds: Diet[] = diet ? [diet] : ['veg', 'nonVeg'];
    lines.push(
      `Pay & Use${diet ? ` (${label(diet).toLowerCase()})` : ''}: ` +
        meals.map((m) => `${MEAL[m]} ${ds.map((d) => rupees(c.payAndUse[m][d])).join('/')}`).join(', '),
    );
  }
  return lines.join('\n');
}

export async function answerQuery(query: AiQueryName, params: Record<string, AiParamValue>, campusId: string, today: string): Promise<string> {
  switch (query) {
    case 'mess_pricing': {
      const all = await listMessPricing(campusId);
      const current = resolveMessPricingForDate(all, today);
      if (!current) return 'No mess prices are in effect today.';
      const upcoming = upcomingMessPricing(all, today);
      return [
        `Current mess prices (from ${formatShortDate(current.effectiveFrom)}):`,
        messAnswer(current, params),
        ...(upcoming.length ? [`Scheduled: new prices from ${upcoming.map((u) => formatShortDate(u.effectiveFrom)).join(', ')}.`] : []),
      ].join('\n');
    }
    case 'buses': {
      const d = params.date !== undefined ? normalizeDate(params.date, today) : { ok: true as const, value: today };
      if (!d.ok) return d.error;
      const day = await previewTripsForDate(campusId, d.value);
      const bus = typeof params.route === 'string' ? (/(\d+)/.exec(params.route)?.[1] ?? null) : null;
      const trips = bus ? day.trips.filter((t) => t.bus.replace(/\D/g, '') === bus) : day.trips;
      const when = d.value === today ? 'today' : formatShortDate(d.value);
      if (!trips.length) return `No buses ${bus ? `for that route ` : ''}${when}.`;
      const head = day.source === 'exception' ? `Buses ${when} (special schedule in effect):` : `Buses ${when}:`;
      const line = (t: (typeof trips)[number]) =>
        `${t.bus} ${t.startTime} ${t.from} → ${t.to}${t.serviceStatus === 'cancelled' ? ' — CANCELLED' : t.serviceStatus === 'modified' ? ' (changed)' : ''}`;
      return [head, ...trips.map(line)].join('\n');
    }
    case 'notices': {
      const notices = await getNotices(campusId);
      if (!notices.length) return 'There are no active notices right now.';
      return [`Active notices (${notices.length}):`, ...notices.slice(0, 10).map((n) => `• ${n.title} — until ${formatShortDate(new Date(n.expiryDate).toISOString().slice(0, 10))}`)].join('\n');
    }
    case 'holidays': {
      const list = ((await getHolidays(campusId))?.holidays ?? []).filter((h) => h.isActive && h.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      if (!list.length) return 'No upcoming institute holidays are set.';
      return ['Upcoming holidays:', ...list.slice(0, 10).map((h) => `• ${h.name} — ${formatShortDate(h.date)}`)].join('\n');
    }
    case 'transport_alerts': {
      const alerts = ((await getTransportAlerts(campusId))?.alerts ?? []).filter((a) => a.isActive);
      if (!alerts.length) return 'There are no active transport alerts right now.';
      return [`Active transport alerts (${alerts.length}):`, ...alerts.slice(0, 10).map((a) => `• ${a.title} — ${a.message}`)].join('\n');
    }
  }
}
