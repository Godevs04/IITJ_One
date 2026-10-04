import { useEffect, useMemo, useState } from 'react';
import { resolveTransportForDate, type TransportForDateResult } from '@iitj1/types';
import { apiGet, CAMPUS_ID } from '@/services/api';
import { useCampusModule } from '@/hooks/useCampusModule';
import type {
  ActiveScheduleExceptionResponse,
  HolidaysDoc,
  TemporaryTransportScheduleDoc,
  TransportAlertsDoc,
  TransportTrip,
} from '@/types/campus';

export interface TransportForDate {
  result: TransportForDateResult;
  /** Trips of a date-specific exception, straight from transport data (never synthesized). */
  exceptionTrips: TransportTrip[];
  /** Enabled entries of the existing temporary schedule, when an alert override covers the date. */
  overrideTrips: { bus: string; time: string; from: string; to: string }[];
  loading: boolean;
}

/**
 * "Which bus schedule applies on YYYY-MM-DD?" — read-only, using the same precedence as the live resolvers
 * (exception → alert override → configured holiday → Sunday → Mon–Sat). Cached modules give holidays/alerts;
 * the date-specific exception comes from GET /transport/temporary/for-date. Offline, the exception is
 * marked unknown instead of being assumed absent.
 */
export function useTransportForDate(date: string | null): TransportForDate | null {
  const holidays = useCampusModule<HolidaysDoc>('holidays');
  const alerts = useCampusModule<TransportAlertsDoc>('transportAlerts');
  const tempSchedule = useCampusModule<TemporaryTransportScheduleDoc>('temporaryTransportSchedule');
  const [exception, setException] = useState<ActiveScheduleExceptionResponse | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    let alive = true;
    setLoading(true);
    setException(undefined);
    apiGet<ActiveScheduleExceptionResponse>('/transport/temporary/for-date', { campus: CAMPUS_ID, date })
      .then((r) => alive && setException(r))
      .catch(() => alive && setException(undefined))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  return useMemo(() => {
    if (!date) return null;
    const result = resolveTransportForDate({
      date,
      holidays,
      alerts,
      exception:
        exception === undefined
          ? undefined
          : { hasTemporarySchedule: exception?.hasTemporarySchedule ?? false, title: exception?.schedule?.title ?? null },
    });
    return {
      result,
      exceptionTrips: result.layer === 'exception' ? (exception?.schedule?.trips ?? []) : [],
      overrideTrips:
        result.layer === 'alert_override'
          ? (tempSchedule?.schedules ?? [])
              .filter((s) => s.enabled)
              .map((s) => ({ bus: s.busNumber, time: s.departureTime, from: s.from, to: s.to }))
          : [],
      loading,
    };
  }, [date, holidays, alerts, tempSchedule, exception, loading]);
}
