import { z } from 'zod';
import { cancelledTripRefSchema } from './transport';
import { messPricingInputSchema } from './messPricing';

/**
 * AI Admin — command model and validation boundary (no LLM here).
 *
 * The future AI may only produce one of the ALLOWED actions below: a closed, typed set whose payloads are
 * strict (unknown keys are rejected). There is deliberately no "query", "update any field" or "raw
 * operation" action — every action maps to an existing shared service function that validates and audits
 * it again before anything is written. The backend never trusts the model's output.
 */

const isoDateTime = z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Must be a valid date/time');
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const entityId = z.string().trim().min(1).max(100);

/** Existing push topics only — no new audiences (route-specific targeting is not supported yet). */
export const AI_PUSH_TOPICS = [
  'iitj_all',
  'iitj_mess',
  'iitj_transport',
  'iitj_institute',
  'iitj_orientation',
  'iitj_emergency',
  'iitj_calendar',
  'iitj_laundry',
] as const;

const noticeFields = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
    category: z.enum(['general', 'mess', 'transport', 'institute', 'orientation']),
    isImportant: z.boolean().default(false),
    startDate: isoDateTime,
    expiryDate: isoDateTime,
    link: z.string().url().optional(),
  })
  .strict();

export const aiActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_notice'), payload: noticeFields }).strict(),
  z
    .object({
      type: z.literal('update_notice'),
      payload: z.object({ noticeId: entityId, changes: noticeFields.partial().strict() }).strict(),
    })
    .strict(),
  z.object({ type: z.literal('delete_notice'), payload: z.object({ noticeId: entityId }).strict() }).strict(),
  z
    .object({
      type: z.literal('create_transport_alert'),
      payload: z
        .object({
          title: z.string().trim().min(1).max(200),
          message: z.string().trim().min(1).max(2000),
          priority: z.enum(['normal', 'info', 'warning', 'critical']),
          category: z.enum(['service_update', 'breakdown', 'maintenance', 'holiday', 'emergency', 'info', 'other']),
          startDate: isoDateTime,
          endDate: isoDateTime,
          pinToHome: z.boolean().default(false),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('set_transport_alert_active'),
      payload: z.object({ alertId: entityId, isActive: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('create_bus_cancellation'),
      payload: z
        .object({
          title: z.string().trim().min(1).max(200),
          reason: z.string().trim().min(1).max(200),
          description: z.string().trim().min(1).max(5000),
          effectiveFrom: isoDateTime,
          effectiveUntil: isoDateTime,
          priority: z.enum(['low', 'normal', 'high', 'critical']).default('high'),
          cancelledTrips: z.array(cancelledTripRefSchema).min(1).max(20),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('create_holiday'),
      payload: z.object({ name: z.string().trim().min(1).max(200), date: dateOnly, description: z.string().max(500).optional() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('set_holiday_active'),
      payload: z.object({ holidayId: entityId, isActive: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('create_mess_pricing'),
      payload: messPricingInputSchema.omit({ campusId: true }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('set_mess_pricing_active'),
      payload: z.object({ pricingId: entityId, isActive: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('send_push_notification'),
      payload: z
        .object({
          topic: z.enum(AI_PUSH_TOPICS),
          title: z.string().trim().min(1).max(100),
          body: z.string().trim().min(1).max(500),
        })
        .strict(),
    })
    .strict(),
]);

export type AiAction = z.infer<typeof aiActionSchema>;
export type AiActionType = AiAction['type'];

export type AiConfirmationLevel = 'standard' | 'explicit' | 'typed';

export interface AiActionPolicy {
  /** What the admin sees in the action list. */
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  /** standard: Run button. explicit: a second "Confirm" step. typed: the admin types the confirmation phrase. */
  confirmation: AiConfirmationLevel;
  sendsNotification: boolean;
  affectsTransport: boolean;
}

/** Policy per allowed action — the backend applies these, never the model. */
export const AI_ACTION_POLICIES: Record<AiActionType, AiActionPolicy> = {
  create_notice: { description: 'Post a notice', risk: 'low', confirmation: 'standard', sendsNotification: false, affectsTransport: false },
  update_notice: { description: 'Edit a notice', risk: 'low', confirmation: 'standard', sendsNotification: false, affectsTransport: false },
  delete_notice: { description: 'Delete a notice', risk: 'medium', confirmation: 'explicit', sendsNotification: false, affectsTransport: false },
  create_transport_alert: { description: 'Post a transport alert', risk: 'medium', confirmation: 'explicit', sendsNotification: false, affectsTransport: false },
  set_transport_alert_active: { description: 'Turn a transport alert on/off', risk: 'medium', confirmation: 'explicit', sendsNotification: false, affectsTransport: false },
  create_bus_cancellation: { description: 'Cancel specific bus trips', risk: 'critical', confirmation: 'typed', sendsNotification: false, affectsTransport: true },
  create_holiday: { description: 'Add a holiday (Sunday & Holidays buses that day)', risk: 'high', confirmation: 'explicit', sendsNotification: false, affectsTransport: true },
  set_holiday_active: { description: 'Turn a holiday on/off', risk: 'high', confirmation: 'explicit', sendsNotification: false, affectsTransport: true },
  create_mess_pricing: { description: 'Schedule new mess prices', risk: 'high', confirmation: 'explicit', sendsNotification: false, affectsTransport: false },
  set_mess_pricing_active: { description: 'Activate/deactivate mess prices', risk: 'high', confirmation: 'explicit', sendsNotification: false, affectsTransport: false },
  send_push_notification: { description: 'Send a push notification', risk: 'critical', confirmation: 'typed', sendsNotification: true, affectsTransport: false },
};

export const AI_ALLOWED_ACTIONS = Object.keys(AI_ACTION_POLICIES) as AiActionType[];

/** The phrase a typed confirmation requires (deterministic, shown in the preview). */
export function typedConfirmationPhrase(action: AiAction): string {
  return action.type === 'create_bus_cancellation' ? 'CANCEL BUSES' : action.type === 'send_push_notification' ? 'SEND' : 'CONFIRM';
}

// ─── Command record & lifecycle ───────────────────────────────────────────────

export const AI_COMMAND_STATUSES = [
  'interpreted', // structured action produced and validated
  'previewed', // preview (before/after, side effects) computed and shown
  'confirmed', // admin confirmed (incl. typed confirmation when required)
  'executing', // claimed for execution — exactly one caller can win this transition
  'executed', // done; auditId recorded
  'failed', // execution attempted and failed (error recorded)
  'rejected', // invalid / not allowed — never executable
  'cancelled', // admin abandoned it
  'expired', // preview/confirmation went stale
] as const;
export type AiCommandStatus = (typeof AI_COMMAND_STATUSES)[number];

export const AI_COMMAND_TRANSITIONS: Record<AiCommandStatus, readonly AiCommandStatus[]> = {
  interpreted: ['previewed', 'rejected', 'cancelled', 'expired'],
  previewed: ['confirmed', 'rejected', 'cancelled', 'expired'],
  confirmed: ['executing', 'cancelled', 'expired'],
  executing: ['executed', 'failed'],
  executed: [],
  failed: [],
  rejected: [],
  cancelled: [],
  expired: [],
};

export function canTransition(from: AiCommandStatus, to: AiCommandStatus): boolean {
  return AI_COMMAND_TRANSITIONS[from].includes(to);
}

export interface AiCommandPreview {
  summary: string;
  entity?: { kind: string; id?: string; label?: string };
  before?: unknown;
  after?: unknown;
  audience?: string;
  notification?: string;
  sideEffects: string[];
  generatedAt: string;
}

export interface AiCommandRecord {
  _id?: string;
  commandId: string;
  campusId: string;
  /** The admin who issued the command (email is the admin identity in this system). */
  adminId: string;
  adminRole: string;
  /** Exactly what the admin typed. */
  originalPrompt: string;
  /** The interpreted action type (or null when nothing valid could be interpreted). */
  interpretedAction: AiActionType | null;
  /** The validated, structured action — never a query or code. Null when rejected. */
  action: AiAction | null;
  status: AiCommandStatus;
  preview: AiCommandPreview | null;
  confirmation: {
    level: AiConfirmationLevel;
    requiredPhrase: string | null;
    confirmedAt: string | null;
    confirmedBy: string | null;
  };
  execution: {
    startedAt: string | null;
    finishedAt: string | null;
    result: unknown;
  } | null;
  /** The audit-log entry the executed operation wrote (and all of them, if it wrote several). */
  auditId: string | null;
  auditIds: string[];
  error: { code: string; message: string; details?: unknown; at: string } | null;
  /** Client-supplied key: the same key can never create (and so never execute) a second command. */
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export const aiCommandCreateSchema = z
  .object({
    campusId: z.string().min(1),
    originalPrompt: z.string().trim().min(1).max(2000),
    idempotencyKey: z.string().trim().min(8).max(100),
    /** Untrusted model output — validated against aiActionSchema by the backend. */
    action: z.unknown(),
  })
  .strict();
