import type { Request } from 'express';

/** Optimistic-concurrency token for whole-doc PUT modules — see store/index.ts assertVersionMatches. */
export function readExpectedVersion(req: Request): number | undefined {
  const header = req.header('x-expected-version');
  if (!header) return undefined;
  const parsed = Number(header);
  return Number.isFinite(parsed) ? parsed : undefined;
}
