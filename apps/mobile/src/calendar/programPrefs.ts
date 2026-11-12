import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalendarProgram } from './eventRules';

/**
 * UG/PG preference for the academic calendar (plan §12). There are no student accounts, so the app never
 * assumes a program: default "all", optional first-use prompt, stored only on this device.
 */
const PROGRAM_KEY = 'calendar_program_v1';
const PROMPT_KEY = 'calendar_program_prompted_v1';

export function useCalendarProgram() {
  const [program, setProgramState] = useState<CalendarProgram>('all');
  const [prompted, setPrompted] = useState(true); // assume answered until storage says otherwise
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [p, asked] = await Promise.all([AsyncStorage.getItem(PROGRAM_KEY), AsyncStorage.getItem(PROMPT_KEY)]);
        if (!alive) return;
        if (p === 'ug' || p === 'pg' || p === 'all') setProgramState(p);
        setPrompted(asked === '1');
      } catch {
        // Storage unavailable → keep the safe default (show everything, don't nag).
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setProgram = useCallback(async (next: CalendarProgram) => {
    setProgramState(next);
    setPrompted(true);
    try {
      await AsyncStorage.multiSet([
        [PROGRAM_KEY, next],
        [PROMPT_KEY, '1'],
      ]);
    } catch {
      // Non-fatal: the choice still applies for this session.
    }
  }, []);

  return { program, setProgram, showPrompt: loaded && !prompted };
}
