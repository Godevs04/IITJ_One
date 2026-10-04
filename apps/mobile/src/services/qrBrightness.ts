import { useCallback, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Brightness from 'expo-brightness';
import { getSetting, setSetting } from './cache';

const SETTING_KEY = 'messQrAutoBrightness';

/** Whether the Mess QR screen raises screen brightness (default on). Persisted per device. */
export function useQrAutoBrightnessPreference(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => getSetting(SETTING_KEY, true));
  const update = useCallback((next: boolean) => {
    setEnabled(next);
    setSetting(SETTING_KEY, next);
  }, []);
  return [enabled, update];
}

/**
 * Full brightness while the QR is on screen, so the mess scanner reads it first time.
 *
 * - Android: only this app's window is brightened; restoreSystemBrightnessAsync hands control back.
 * - iOS: brightness is system-wide, so the previous level is saved and put back on leave, and also when
 *   the app goes to the background (otherwise the phone stays at full brightness after switching apps).
 * - Guards the async race: if the screen is left before getBrightnessAsync resolves, nothing is raised.
 */
export function useQrBrightness(active: boolean): void {
  useFocusEffect(
    useCallback(() => {
      if (!active || Platform.OS === 'web') return;
      let cancelled = false;
      let previous: number | null = null;
      let raised = false;

      const raise = async () => {
        try {
          if (Platform.OS === 'ios' && previous === null) previous = await Brightness.getBrightnessAsync();
          if (cancelled) return;
          await Brightness.setBrightnessAsync(1);
          raised = true;
        } catch {
          // Brightness is a convenience — never block showing the QR.
        }
      };

      const restore = async () => {
        if (!raised) return;
        raised = false;
        try {
          if (Platform.OS === 'android') await Brightness.restoreSystemBrightnessAsync();
          else if (previous !== null) await Brightness.setBrightnessAsync(previous);
          // Re-read next time: the user may change brightness while the app is in the background.
          previous = null;
        } catch {
          // ignore
        }
      };

      void raise();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void raise();
        else void restore();
      });

      return () => {
        cancelled = true;
        sub.remove();
        void restore();
      };
    }, [active]),
  );
}
