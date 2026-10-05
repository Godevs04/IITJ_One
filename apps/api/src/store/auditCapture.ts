import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Collects the ids of audit-log entries written during one operation.
 *
 * Every audited write goes through bumpVersion/logAudit (store/index.ts), which report the id of the entry
 * they insert here. Services wrap a mutation in withAuditCapture() to learn the exact audit entries that
 * mutation produced — e.g. so a future AI Admin command record can reference them — without changing the
 * return type of every store function. Same audit log, same entries; this only reads their ids.
 */
// A stack of sinks: nested captures (an AI command wrapping a service that captures its own id) all see it.
const captureStore = new AsyncLocalStorage<string[][]>();

function runWith<T>(sink: string[], fn: () => Promise<T>): Promise<T> {
  return captureStore.run([...(captureStore.getStore() ?? []), sink], fn);
}

export function recordAuditId(id: string): void {
  for (const sink of captureStore.getStore() ?? []) sink.push(id);
}

export async function withAuditCapture<T>(fn: () => Promise<T>): Promise<{ result: T; auditIds: string[] }> {
  const auditIds: string[] = [];
  const result = await runWith(auditIds, fn);
  return { result, auditIds };
}

/**
 * Like withAuditCapture, but the ids reach `sink` as they are written — so a caller still knows which audit
 * entries a failed multi-step operation produced before it threw.
 */
export async function captureAuditIdsInto<T>(sink: string[], fn: () => Promise<T>): Promise<T> {
  return runWith(sink, fn);
}

/** The audit entry a single-write operation produced (the last one if it wrote several). */
export function lastAuditId(auditIds: string[]): string | undefined {
  return auditIds[auditIds.length - 1];
}
