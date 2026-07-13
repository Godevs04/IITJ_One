import { useMemo } from 'react';
import { readCachedModule } from '@/services/sync';

export function useCampusModule<T>(module: string): T | null {
  return useMemo(() => readCachedModule<T>(module as never), [module]);
}
