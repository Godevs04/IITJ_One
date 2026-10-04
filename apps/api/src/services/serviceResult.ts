import { lastAuditId, withAuditCapture } from '../store/auditCapture';

/** A service mutation's result plus the audit-log entry it wrote (absent when nothing was written). */
export interface WithAudit<T> {
  value: T;
  auditId?: string;
}

/** Runs a mutation and reports the (last) audit entry it produced. */
export async function audited<T>(fn: () => Promise<T>): Promise<WithAudit<T>> {
  const { result, auditIds } = await withAuditCapture(fn);
  return { value: result, auditId: lastAuditId(auditIds) };
}
