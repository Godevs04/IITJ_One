/**
 * Injectable clock for route/service call sites that need "now" — lets
 * tests/CI pin a fixed instant instead of depending on the real wall clock,
 * without changing production behavior at all: production never calls
 * setTimeProvider(), so getTimeProvider().now() always resolves to
 * systemTimeProvider, which is exactly `new Date()`.
 *
 * Scoped per-process, same as every other piece of in-memory state in this
 * codebase (contributor pool, GPS throttle map, etc.) — a separate process
 * (e.g. the live dev server an E2E script talks to over HTTP) is never
 * affected by a test process calling setTimeProvider().
 */
export interface TimeProvider {
  now(): Date;
}

export const systemTimeProvider: TimeProvider = {
  now: () => new Date(),
};

let current: TimeProvider = systemTimeProvider;

export function getTimeProvider(): TimeProvider {
  return current;
}

/** Tests/CI only — production code must never call this. */
export function setTimeProvider(provider: TimeProvider): void {
  current = provider;
}

/** Restores the real clock — call in an `after`/`afterEach` hook so a fixed time never leaks into another test. */
export function resetTimeProvider(): void {
  current = systemTimeProvider;
}

/** Convenience for tests: freezes "now" at a fixed instant. */
export function fixedTimeProvider(at: Date): TimeProvider {
  return { now: () => at };
}
