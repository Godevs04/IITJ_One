import { useMemo } from 'react';
import {
  DEFAULT_MESS_PRICING,
  resolveMessPricingForDate,
  todayDateKey,
  type MessPricingDoc,
  type MessPricingInput,
} from '@iitj1/types';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useCampusSync } from '@/hooks/useCampusSync';

export type MessPricingSource = 'server' | 'loading' | 'fallback';

export interface MessPricingView {
  pricing: Omit<MessPricingInput, 'campusId'>;
  /**
   * server: the admin-published price in effect today.
   * loading: nothing synced yet and a sync is running — showing the standard prices meanwhile.
   * fallback: nothing synced (offline / API unavailable) — standard prices, flagged as possibly outdated.
   */
  source: MessPricingSource;
}

/**
 * Mess prices for today, from the synced `messPricing` module (admin-managed). The phone's date picks the
 * configuration, so a scheduled price switches at midnight without waiting for a sync. If nothing has ever
 * synced, the standard prices (the same values the database was seeded with) keep the screen usable.
 */
export function useMessPricing(): MessPricingView {
  const doc = useCampusModule<MessPricingDoc>('messPricing');
  const { syncing } = useCampusSync(false);

  return useMemo(() => {
    const current = doc?.configs ? resolveMessPricingForDate(doc.configs, todayDateKey()) : null;
    if (current) return { pricing: current, source: 'server' as const };
    return { pricing: DEFAULT_MESS_PRICING, source: syncing ? ('loading' as const) : ('fallback' as const) };
  }, [doc, syncing]);
}
