/**
 * One-time* "Help us improve" feedback prompt.
 * (*"one-time" until the user engages with it — see feedback_prompt_completed
 * vs. feedback_last_dismissed_at below.)
 *
 * Accumulates foreground-only active-usage seconds (persisted so a killed
 * app doesn't lose progress), and notifies subscribers whenever it's allowed
 * to fire again — the overlay UI decides *when* it's safe to actually render
 * (idle screen, no other overlay open), this module only decides *whether*.
 */

import { AppState, type AppStateStatus } from 'react-native';
import { getSetting, setSetting } from './cache';
import { isOverlayLocked, onOverlayUnlocked } from './overlayGate';

const USAGE_KEY = 'feedback_usage_seconds';
/** Permanent — only set once the user actually taps "Give Feedback". Never shown again after this. */
const COMPLETED_KEY = 'feedback_prompt_completed';
/** Soft dismissal (later/close/swipe/outside-tap) — eligible again after RESHOW_AFTER_MS. */
const LAST_DISMISSED_KEY = 'feedback_last_dismissed_at';

const THRESHOLD_SECONDS = 600; // 10 minutes of active usage
const TICK_MS = 1000;
/** In-memory counter only ticks every second; disk writes are batched to this cadence to avoid hammering AsyncStorage. */
const PERSIST_INTERVAL_SECONDS = 30;
/** How long after a soft dismissal ("Maybe Later"/close/swipe/outside tap) before it's eligible to show again. Configurable. */
const RESHOW_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Listener = () => void;

class FeedbackPromptManagerImpl {
  private initialized = false;
  private accumulatedSeconds = 0;
  private secondsSinceLastPersist = 0;
  private completed = false;
  private lastDismissedAt: number | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private appStateUnsub: ReturnType<typeof AppState.addEventListener> | null = null;
  private unlockUnsub: (() => void) | null = null;
  private listeners = new Set<Listener>();

  /** Idempotent — safe to call more than once (e.g. React Strict Mode double-effects). */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.accumulatedSeconds = getSetting<number>(USAGE_KEY, 0);
    this.secondsSinceLastPersist = 0;
    this.completed = getSetting<boolean>(COMPLETED_KEY, false);
    this.lastDismissedAt = getSetting<number | null>(LAST_DISMISSED_KEY, null);

    this.unlockUnsub = onOverlayUnlocked(() => this.notifyIfEligible());

    if (AppState.currentState === 'active') {
      this.startTicking();
    }

    this.appStateUnsub = AppState.addEventListener('change', this.handleAppStateChange);
  }

  teardown(): void {
    if (!this.initialized) return;
    this.stopTicking(/* flush */ true);
    this.appStateUnsub?.remove();
    this.appStateUnsub = null;
    this.unlockUnsub?.();
    this.unlockUnsub = null;
    this.listeners.clear();
    this.initialized = false;
  }

  /** Overlay component subscribes to know when it's allowed to show itself. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.notifyIfEligible(); // in case eligibility was already true before this mounted
    return () => this.listeners.delete(listener);
  }

  isEligibleNow(): boolean {
    if (this.completed) return false;
    if (this.accumulatedSeconds < THRESHOLD_SECONDS) return false;
    if (this.lastDismissedAt != null && Date.now() - this.lastDismissedAt < RESHOW_AFTER_MS) return false;
    return true;
  }

  /**
   * Call when the user taps "Give Feedback" — the only interaction that
   * permanently retires the prompt. A crash right after the sheet appears
   * (before any interaction) must NOT count as completed, so this is never
   * called just from showing the sheet.
   */
  markCompleted(): void {
    if (this.completed) return;
    this.completed = true;
    setSetting(COMPLETED_KEY, true);
  }

  /** Call on any soft dismissal (Maybe Later / close / swipe / tap outside) — re-eligible after RESHOW_AFTER_MS. */
  markDismissed(): void {
    this.lastDismissedAt = Date.now();
    setSetting(LAST_DISMISSED_KEY, this.lastDismissedAt);
  }

  /** Development-only: clear all persisted state to re-test the flow. */
  reset(): void {
    this.accumulatedSeconds = 0;
    this.secondsSinceLastPersist = 0;
    this.completed = false;
    this.lastDismissedAt = null;
    setSetting(USAGE_KEY, 0);
    setSetting(COMPLETED_KEY, false);
    setSetting(LAST_DISMISSED_KEY, null);
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'active') {
      this.startTicking();
    } else {
      // background or inactive — stop counting and flush immediately so a
      // kill right after backgrounding never loses this session's progress.
      this.stopTicking(/* flush */ true);
    }
  };

  private startTicking(): void {
    if (this.tickInterval) return; // already running — never double the interval
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private stopTicking(flush: boolean): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (flush) this.persist();
  }

  private tick(): void {
    this.accumulatedSeconds += 1;
    this.secondsSinceLastPersist += 1;
    if (this.secondsSinceLastPersist >= PERSIST_INTERVAL_SECONDS) {
      this.persist();
    }
    this.notifyIfEligible();
  }

  private persist(): void {
    if (this.secondsSinceLastPersist === 0) return;
    setSetting(USAGE_KEY, this.accumulatedSeconds);
    this.secondsSinceLastPersist = 0;
  }

  private notifyIfEligible(): void {
    if (!this.isEligibleNow()) return;
    if (isOverlayLocked()) return;
    this.listeners.forEach((listener) => listener());
  }
}

export const FeedbackPromptManager = new FeedbackPromptManagerImpl();

if (__DEV__) {
  (globalThis as unknown as Record<string, unknown>).__IITJ_ONE_RESET_FEEDBACK_PROMPT__ = () =>
    FeedbackPromptManager.reset();
}
