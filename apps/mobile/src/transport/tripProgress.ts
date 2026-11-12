import { formatClock } from '../reminders/reminderLogic';
import { tripEndMinutes } from './nextBus';

/**
 * Route progress for one scheduled trip — worked out from the timetable alone, so it is a calculation, not a
 * position: the timetable publishes only departure and arrival, so the stops in between are spread evenly across
 * that time. Nothing here reads a GPS position; wording must never suggest it does.
 */

/** One estimated time per stop (minutes after midnight, rounded), evenly spaced from departure to arrival. */
export function estimateStopTimes(startMin: number, endMin: number, stopCount: number): number[] {
  if (stopCount <= 0) return [];
  if (stopCount === 1) return [startMin];
  const end = tripEndMinutes(startMin, endMin);
  return Array.from({ length: stopCount }, (_, i) => Math.round(startMin + ((end - startMin) * i) / (stopCount - 1)));
}

export type TripProgressPhase = 'scheduled' | 'departed' | 'approaching' | 'reached' | 'completed';

export interface TripProgress {
  phase: TripProgressPhase;
  /** Index of the stop the status is about (the last one passed, or the one being approached); null before departure. */
  stopIndex: number | null;
  /** "Current status: Approaching Mandore" */
  label: string;
}

/** How many minutes before a stop's estimated time the bus counts as "approaching" it. */
const APPROACH_MINUTES = 5;
const SOON_MINUTES = 60;

export function tripProgress(
  stops: readonly string[],
  startMin: number,
  endMin: number,
  nowMin: number,
  displayStop: (name: string) => string = (s) => s,
): TripProgress {
  const status = (label: string) => `Current status: ${label}`;
  const end = tripEndMinutes(startMin, endMin);

  if (nowMin < startMin) {
    const until = startMin - nowMin;
    return {
      phase: 'scheduled',
      stopIndex: null,
      label: status(until <= SOON_MINUTES ? `Scheduled to depart in ${until} min` : `Scheduled to depart at ${formatClock(startMin)}`),
    };
  }
  if (nowMin >= end || stops.length === 0) {
    return { phase: 'completed', stopIndex: null, label: status('Completed trip') };
  }

  const times = estimateStopTimes(startMin, endMin, stops.length);
  let passed = 0;
  for (let i = 0; i < times.length; i++) if (times[i] <= nowMin) passed = i;
  const next = passed + 1 < stops.length ? passed + 1 : null;

  if (next != null && times[next] - nowMin <= APPROACH_MINUTES) {
    return { phase: 'approaching', stopIndex: next, label: status(`Approaching ${displayStop(stops[next])}`) };
  }
  if (passed === 0) {
    return { phase: 'departed', stopIndex: 0, label: status(`Departed from ${displayStop(stops[0])}`) };
  }
  return { phase: 'reached', stopIndex: passed, label: status(`Reached ${displayStop(stops[passed])}`) };
}
