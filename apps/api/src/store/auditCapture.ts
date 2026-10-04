import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Collects the ids of audit-log entries written during one operation.
 *
 * Every audited write goes through bumpVersion/logAudit (store/index.ts), which report the id of the entry
 * they insert here. Services wrap a mutation in withAuditCapture() to learn the exact audit entries that
 * mutation produced — e.g. so a future AI Admin command record can reference them — without changing the
 * return type of every store function. Same audit log, same entries; this only reads their ids.
 */
const captureStore = new AsyncLocalStorage<string[]>();

export function recordAuditId(id: string): void {
  captureStore.getStore()?.push(id);
}

export async function withAuditCapture<T>(fn: () => Promise<T>): Promise<{ result: T; auditIds: string[] }> {
  const auditIds: string[] = [];
  const result = await captureStore.run(auditIds, fn);
  return { result, auditIds };
}

/** The audit entry a single-write operation produced (the last one if it wrote several). */
export function lastAuditId(auditIds: string[]): string | undefined {
  return auditIds[auditIds.length - 1];
}
