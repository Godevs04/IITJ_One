/**
 * Transport alerts — shared business layer for the admin routes and, later, AI Admin. Alerts are stored as
 * one list per campus (unchanged); these functions read-modify-write it through putTransportAlerts, which
 * keeps the version check, version bump and audit log. Results carry the audit id.
 *
 * Notifications: saving an alert never sends a push (unchanged behaviour). notifyTransportAlert() is the
 * explicit, separate step — it sends through the shared push service to the existing transport topic and
 * is not called by any current admin workflow.
 */
import { randomUUID } from 'node:crypto';
import type { TransportAlert } from '@iitj1/types';
import { getMeta, getTransportAlerts, putTransportAlerts } from '../store';
import { audited, type WithAudit } from './serviceResult';
import { dispatchTopicPush, type TopicPushOutcome } from './push';
import type { TransportAlertsDoc } from '../types';

export type AlertResult =
  | { ok: true; doc: TransportAlertsDoc; alert?: TransportAlert }
  | { ok: false; reason: 'invalid'; errors: string[] }
  | { ok: false; reason: 'not_found' };

export type TransportAlertInput = Omit<TransportAlert, 'id' | 'createdAt' | 'updatedAt'>;

/** The existing app-wide transport topic (no route-specific targeting yet). */
export const TRANSPORT_ALERT_TOPIC = 'iitj_transport';

export function validateAlerts(alerts: readonly TransportAlert[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const a of alerts) {
    if (ids.has(a.id)) errors.push(`Duplicate alert id "${a.id}"`);
    ids.add(a.id);
    if (!a.title?.trim() || !a.message?.trim()) errors.push(`Alert "${a.title || a.id}" needs a title and a message`);
    const start = new Date(a.startDate).getTime();
    const end = new Date(a.endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) errors.push(`Alert "${a.title}" has an invalid start or end date`);
    else if (end <= start) errors.push(`Alert "${a.title}" must end after it starts`);
  }
  return errors;
}

async function currentDoc(campusId: string): Promise<{ doc: TransportAlertsDoc; version: number | undefined }> {
  const [doc, meta] = await Promise.all([getTransportAlerts(campusId), getMeta(campusId)]);
  return { doc: doc ?? { campusId, alerts: [] }, version: meta.versions.transportAlerts };
}

async function save(next: TransportAlertsDoc, adminEmail: string, version: number | undefined, alert?: TransportAlert): Promise<WithAudit<AlertResult>> {
  const errors = validateAlerts(next.alerts);
  if (errors.length) return { value: { ok: false, reason: 'invalid', errors } };
  return audited(async () => {
    await putTransportAlerts(next, adminEmail, version);
    return { ok: true as const, doc: next, alert };
  });
}

/** The admin Transport Alerts page's whole-list save (PUT /admin/transportAlerts) — now validated. */
export async function replaceTransportAlerts(doc: TransportAlertsDoc, adminEmail: string, expectedVersion?: number): Promise<WithAudit<AlertResult>> {
  return save(doc, adminEmail, expectedVersion);
}

export async function createTransportAlert(campusId: string, input: TransportAlertInput, adminEmail: string): Promise<WithAudit<AlertResult>> {
  const { doc, version } = await currentDoc(campusId);
  const now = new Date().toISOString();
  const alert: TransportAlert = { ...input, id: `alert_${randomUUID()}`, createdAt: now, updatedAt: now };
  return save({ ...doc, alerts: [alert, ...doc.alerts] }, adminEmail, version, alert);
}

export async function updateTransportAlert(
  campusId: string,
  id: string,
  patch: Partial<TransportAlertInput>,
  adminEmail: string,
): Promise<WithAudit<AlertResult>> {
  const { doc, version } = await currentDoc(campusId);
  const existing = doc.alerts.find((a) => a.id === id);
  if (!existing) return { value: { ok: false, reason: 'not_found' } };
  const alert = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  return save({ ...doc, alerts: doc.alerts.map((a) => (a.id === id ? alert : a)) }, adminEmail, version, alert);
}

export async function setTransportAlertActive(campusId: string, id: string, isActive: boolean, adminEmail: string): Promise<WithAudit<AlertResult>> {
  return updateTransportAlert(campusId, id, { isActive }, adminEmail);
}

export async function deleteTransportAlert(campusId: string, id: string, adminEmail: string): Promise<WithAudit<AlertResult>> {
  const { doc, version } = await currentDoc(campusId);
  const existing = doc.alerts.find((a) => a.id === id);
  if (!existing) return { value: { ok: false, reason: 'not_found' } };
  return save({ ...doc, alerts: doc.alerts.filter((a) => a.id !== id) }, adminEmail, version, existing);
}

/**
 * Explicitly push an alert to the transport topic via the shared push service (records push history and
 * audits like the Push page). Never called implicitly by saving an alert.
 */
export async function notifyTransportAlert(
  campusId: string,
  id: string,
  adminEmail: string,
): Promise<WithAudit<TopicPushOutcome | { outcome: 'not_found' }>> {
  const alert = (await getTransportAlerts(campusId))?.alerts.find((a) => a.id === id);
  if (!alert) return { value: { outcome: 'not_found' } };
  return audited(() =>
    dispatchTopicPush({ topic: TRANSPORT_ALERT_TOPIC, title: alert.title, body: alert.message, data: { screen: 'transport', alertId: alert.id } }, adminEmail),
  );
}
