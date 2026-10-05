import { z } from 'zod';

/**
 * AI Admin — conversational command model (shared by the API and the admin UI).
 *
 * The language model only interprets: it returns an `AiInterpretation` (intent + action name + flat
 * parameters). That output is untrusted — it is validated against `aiInterpretationSchema`, every action is
 * one of the closed `AI_ACTIONS`, and the backend (not the model) decides which fields are required,
 * resolves entities, validates, previews, asks for confirmation, executes through the shared services and
 * records the audit id. There is no "query", "raw update" or code-carrying action.
 */

// ─── Actions (mutations) and read-only questions ────────────────────────────────

export const AI_ACTIONS = [
  'create_notice',
  'update_notice',
  'delete_notice',
  'create_mess_pricing',
  'update_mess_pricing',
  'deactivate_mess_pricing',
  'create_transport_alert',
  'update_transport_alert',
  'cancel_bus_trip',
  'create_holiday',
  'update_holiday',
  'remove_holiday',
  'temporary_mess_update',
] as const;
export type AiActionName = (typeof AI_ACTIONS)[number];

/** Read-only questions — answered from current data, never create a command. */
export const AI_QUERIES = ['mess_pricing', 'buses', 'notices', 'holidays', 'transport_alerts'] as const;
export type AiQueryName = (typeof AI_QUERIES)[number];

export type AiRiskLevel = 'low' | 'medium' | 'high';

export interface AiActionPolicy {
  label: string;
  risk: AiRiskLevel;
  /** Label of the confirm button on the preview card. */
  confirmLabel: string;
}

/**
 * Backend risk policy. Every action here changes data, so every one needs a preview and a confirmation.
 * HIGH: only the explicit Confirm button on the current preview counts — a typed "yes" never does.
 */
export const AI_ACTION_POLICIES: Record<AiActionName, AiActionPolicy> = {
  create_notice: { label: 'Post notice', risk: 'medium', confirmLabel: 'Post notice' },
  update_notice: { label: 'Edit notice', risk: 'medium', confirmLabel: 'Save changes' },
  delete_notice: { label: 'Delete notice', risk: 'high', confirmLabel: 'Delete notice' },
  create_mess_pricing: { label: 'Schedule mess price', risk: 'medium', confirmLabel: 'Schedule price' },
  update_mess_pricing: { label: 'Change mess price', risk: 'medium', confirmLabel: 'Change price' },
  deactivate_mess_pricing: { label: 'Deactivate mess prices', risk: 'high', confirmLabel: 'Deactivate' },
  create_transport_alert: { label: 'Post transport alert', risk: 'medium', confirmLabel: 'Post alert' },
  update_transport_alert: { label: 'Edit transport alert', risk: 'medium', confirmLabel: 'Save changes' },
  cancel_bus_trip: { label: 'Cancel bus trip', risk: 'high', confirmLabel: 'Confirm cancellation' },
  create_holiday: { label: 'Add holiday', risk: 'medium', confirmLabel: 'Add holiday' },
  update_holiday: { label: 'Edit holiday', risk: 'medium', confirmLabel: 'Save changes' },
  remove_holiday: { label: 'Remove holiday', risk: 'high', confirmLabel: 'Remove holiday' },
  temporary_mess_update: { label: 'Temporary mess update', risk: 'high', confirmLabel: 'Confirm mess update' },
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export const AI_COMMAND_STATUSES = [
  'collecting_information', // required fields missing, ambiguous or invalid — the assistant is asking
  'ready_for_preview', // complete and validated
  'awaiting_confirmation', // preview shown; needs the admin's confirmation of exactly this preview
  'executing', // claimed for execution — only one request can ever win this transition
  'executed',
  'cancelled',
  'rejected',
  'failed',
] as const;
export type AiCommandStatus = (typeof AI_COMMAND_STATUSES)[number];

export const AI_PENDING_STATUSES: readonly AiCommandStatus[] = ['collecting_information', 'ready_for_preview', 'awaiting_confirmation'];

/** Enforced by the backend. There is no path to `executed` except confirmed → executing → executed. */
export const AI_COMMAND_TRANSITIONS: Record<AiCommandStatus, readonly AiCommandStatus[]> = {
  collecting_information: ['collecting_information', 'ready_for_preview', 'cancelled', 'rejected'],
  ready_for_preview: ['awaiting_confirmation', 'collecting_information', 'cancelled', 'rejected'],
  awaiting_confirmation: ['executing', 'collecting_information', 'cancelled', 'rejected'],
  executing: ['executed', 'failed'],
  executed: [],
  cancelled: [],
  rejected: [],
  failed: [],
};

export function canTransition(from: AiCommandStatus, to: AiCommandStatus): boolean {
  return AI_COMMAND_TRANSITIONS[from].includes(to);
}

// ─── Untrusted interpreter output ─────────────────────────────────────────────

const paramValue = z.union([z.string().max(2000), z.number().finite(), z.boolean()]);

/**
 * The ONLY shape accepted from the language model. Flat primitive parameters (no objects, arrays, code or
 * queries); action/query names from closed enums; unknown keys rejected.
 */
export const aiInterpretationSchema = z
  .object({
    intent: z.enum(['command', 'update_pending', 'cancel_pending', 'confirm', 'query', 'unsupported', 'help']),
    action: z.enum(AI_ACTIONS).optional(),
    query: z.enum(AI_QUERIES).optional(),
    parameters: z
      .record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/), paramValue)
      .refine((p) => Object.keys(p).length <= 20, 'Too many parameters')
      .optional(),
  })
  .strict()
  .refine((v) => v.intent !== 'command' || !!v.action, { message: 'A command needs an action', path: ['action'] })
  .refine((v) => v.intent !== 'query' || !!v.query, { message: 'A query needs a query name', path: ['query'] });
export type AiInterpretation = z.infer<typeof aiInterpretationSchema>;
export type AiParamValue = z.infer<typeof paramValue>;

// ─── Conversation & command records ───────────────────────────────────────────

export interface AiOption {
  label: string;
  /** Sent back as a structured selection for `field` — no re-interpretation needed. */
  value: string;
}

export interface AiQuestion {
  field: string;
  text: string;
  options?: AiOption[];
}

export interface AiResolvedEntity {
  field: string;
  kind: 'notice' | 'bus' | 'trip' | 'mess_pricing' | 'transport_alert' | 'holiday' | 'calendar_event';
  id: string;
  label: string;
  /** Where the value came from, e.g. "Timetable", "Academic calendar". */
  source?: string;
}

export interface AiPreview {
  title: string;
  /** One line under the title, e.g. "5:00 PM · Tuesday, 6 October 2026". */
  subtitle?: string;
  rows: { label: string; value: string; before?: string }[];
  warnings: string[];
  notification: string;
  risk: AiRiskLevel;
  confirmLabel: string;
}

export interface AiCommandRecord {
  _id?: string;
  commandId: string;
  sessionId: string;
  campusId: string;
  adminId: string;
  adminRole: string;
  /** The admin message that started this command. */
  originalPrompt: string;
  action: AiActionName;
  /** Normalized parameters collected so far (backend-validated values only). */
  parameters: Record<string, AiParamValue>;
  missingFields: string[];
  question: AiQuestion | null;
  resolvedEntities: AiResolvedEntity[];
  validationResult: { ok: boolean; errors: string[] } | null;
  preview: AiPreview | null;
  /** Changes every time the preview changes — a confirmation must quote the current one. */
  previewToken: string | null;
  previewedAt: string | null;
  riskLevel: AiRiskLevel;
  confirmationRequired: boolean;
  confirmationStatus: 'not_requested' | 'pending' | 'confirmed';
  confirmedAt: string | null;
  confirmedBy: string | null;
  status: AiCommandStatus;
  execution: { startedAt: string | null; finishedAt: string | null; summary: string | null } | null;
  /** The audit-log entry written by the shared service (the last one, if it wrote several). */
  auditId: string | null;
  auditIds: string[];
  error: { code: string; message: string; at: string } | null;
  /** Unique (one command per key). Equal to commandId for conversational commands. */
  idempotencyKey: string;
  /** Bumped on every change — guards concurrent edits of a pending command. */
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'admin' | 'assistant';
  text: string;
  at: string;
  kind?: 'question' | 'preview' | 'result' | 'error' | 'answer' | 'info';
  commandId?: string;
  options?: AiOption[];
  /** Field the options answer. */
  optionField?: string;
  preview?: AiPreview;
  previewToken?: string;
  auditId?: string;
}

export interface AiSessionRecord {
  _id?: string;
  sessionId: string;
  campusId: string;
  adminId: string;
  messages: AiMessage[];
  /** The command this conversation is currently working on (pending), if any. */
  activeCommandId: string | null;
  /** Recently processed client message ids — a retried request is not processed twice. */
  processedClientIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── API views (what the admin browser receives) ─────────────────────────────

export interface AiCommandView {
  commandId: string;
  action: AiActionName;
  actionLabel: string;
  status: AiCommandStatus;
  parameters: Record<string, AiParamValue>;
  missingFields: string[];
  question: AiQuestion | null;
  resolvedEntities: AiResolvedEntity[];
  validationResult: { ok: boolean; errors: string[] } | null;
  preview: AiPreview | null;
  previewToken: string | null;
  riskLevel: AiRiskLevel;
  confirmationRequired: boolean;
  confirmationStatus: AiCommandRecord['confirmationStatus'];
  executionStatus: AiCommandStatus;
  auditId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiSessionView {
  sessionId: string;
  adminId: string;
  messages: AiMessage[];
  activeCommand: AiCommandView | null;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiHistoryItem {
  commandId: string;
  summary: string;
  action: AiActionName;
  actionLabel: string;
  status: AiCommandStatus;
  adminId: string;
  auditId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const aiMessageInputSchema = z
  .object({
    text: z.string().trim().max(1000).optional(),
    /** A click on one of the assistant's options. */
    select: z.object({ field: z.string().min(1).max(40), value: z.string().min(1).max(200) }).strict().optional(),
    clientMessageId: z.string().min(8).max(100).optional(),
  })
  .strict()
  .refine((v) => !!v.text || !!v.select, 'Send a message or pick an option');
export type AiMessageInput = z.infer<typeof aiMessageInputSchema>;

export const aiConfirmInputSchema = z.object({ previewToken: z.string().min(8).max(100) }).strict();
