/**
 * AI Admin — command lifecycle (model + validation boundary only).
 *
 * There is no LLM, no route and no executor here yet. This service only records what a future
 * interpreter produced and moves the record through its lifecycle:
 *
 *   interpreted → previewed → confirmed → executing → executed | failed
 *   (any pre-execution state → rejected | cancelled | expired)
 *
 * Guarantees:
 * - The action is validated against the closed allowlist (aiActionSchema). Anything else is stored as
 *   `rejected` and can never move forward.
 * - One idempotencyKey ⇒ one command (unique index), so retrying a request cannot create a second one.
 * - beginExecution is an atomic compare-and-set confirmed → executing: only one caller can ever win it,
 *   so a command cannot execute twice.
 * - Only the admin who issued a command can confirm it; typed-confirmation actions need the exact phrase.
 */
import { randomUUID } from 'node:crypto';
import {
  AI_ACTION_POLICIES,
  AI_COMMAND_STATUSES,
  aiActionSchema,
  canTransition,
  typedConfirmationPhrase,
  type AiCommandPreview,
  type AiCommandRecord,
  type AiCommandStatus,
} from '@iitj1/types';
import { findAiCommand, insertAiCommand, transitionAiCommand } from '../store';

export interface AiCommandActor {
  email: string;
  role: string;
}

export type AiCommandResult =
  | { ok: true; command: AiCommandRecord; duplicate?: boolean }
  | {
      ok: false;
      reason: 'not_found' | 'invalid_transition' | 'forbidden' | 'confirmation_mismatch' | 'already_claimed';
      message: string;
      command?: AiCommandRecord;
    };

function nowIso(): string {
  return new Date().toISOString();
}

/** Statuses a command may be moved to `to` from (derived from AI_COMMAND_TRANSITIONS). */
function sourcesFor(to: AiCommandStatus): AiCommandStatus[] {
  return AI_COMMAND_STATUSES.filter((from) => canTransition(from, to));
}

export function getAiCommand(commandId: string): Promise<AiCommandRecord | null> {
  return findAiCommand({ commandId });
}

/**
 * Records the interpreter's output. `action` is untrusted: it is validated here, and an invalid or
 * non-allowlisted action is stored as `rejected` (kept for the audit trail, never executable).
 * Reusing an idempotencyKey returns the existing command unchanged.
 */
export async function recordInterpretedCommand(input: {
  campusId: string;
  originalPrompt: string;
  idempotencyKey: string;
  action: unknown;
  actor: AiCommandActor;
}): Promise<AiCommandResult> {
  const existing = await findAiCommand({ idempotencyKey: input.idempotencyKey });
  if (existing) return { ok: true, command: existing, duplicate: true };

  const parsed = aiActionSchema.safeParse(input.action);
  const at = nowIso();
  const interpretedType =
    typeof input.action === 'object' && input.action !== null && typeof (input.action as { type?: unknown }).type === 'string'
      ? ((input.action as { type: string }).type as keyof typeof AI_ACTION_POLICIES)
      : null;
  const action = parsed.success ? parsed.data : null;
  const policy = action ? AI_ACTION_POLICIES[action.type] : null;

  const command: AiCommandRecord = {
    commandId: randomUUID(),
    campusId: input.campusId,
    adminId: input.actor.email,
    adminRole: input.actor.role,
    originalPrompt: input.originalPrompt,
    interpretedAction: action ? action.type : interpretedType && interpretedType in AI_ACTION_POLICIES ? interpretedType : null,
    action,
    status: action ? 'interpreted' : 'rejected',
    preview: null,
    confirmation: {
      level: policy?.confirmation ?? 'explicit',
      requiredPhrase: action && policy?.confirmation === 'typed' ? typedConfirmationPhrase(action) : null,
      confirmedAt: null,
      confirmedBy: null,
    },
    execution: null,
    auditId: null,
    auditIds: [],
    error: parsed.success
      ? null
      : {
          code: 'invalid_action',
          message: 'The interpreted action is not an allowed, valid command',
          details: parsed.error.flatten(),
          at,
        },
    idempotencyKey: input.idempotencyKey,
    createdAt: at,
    updatedAt: at,
  };

  if (!(await insertAiCommand(command))) {
    // Lost a race on the same idempotencyKey — return the winner.
    const winner = await findAiCommand({ idempotencyKey: input.idempotencyKey });
    if (winner) return { ok: true, command: winner, duplicate: true };
    throw new Error('AI command insert conflict');
  }
  return { ok: true, command: (await findAiCommand({ commandId: command.commandId })) ?? command };
}

async function move(
  commandId: string,
  to: AiCommandStatus,
  set: Partial<AiCommandRecord> = {},
): Promise<AiCommandResult> {
  const updated = await transitionAiCommand(commandId, sourcesFor(to), { ...set, status: to, updatedAt: nowIso() });
  if (updated) return { ok: true, command: updated };
  const current = await findAiCommand({ commandId });
  if (!current) return { ok: false, reason: 'not_found', message: 'Command not found' };
  return {
    ok: false,
    reason: to === 'executing' && current.status === 'executing' ? 'already_claimed' : 'invalid_transition',
    message: `Cannot move a ${current.status} command to ${to}`,
    command: current,
  };
}

export function attachPreview(commandId: string, preview: Omit<AiCommandPreview, 'generatedAt'>): Promise<AiCommandResult> {
  return move(commandId, 'previewed', { preview: { ...preview, generatedAt: nowIso() } });
}

/** The issuing admin confirms; typed-confirmation actions must supply the exact phrase. */
export async function confirmCommand(commandId: string, actor: AiCommandActor, typedPhrase?: string): Promise<AiCommandResult> {
  const current = await findAiCommand({ commandId });
  if (!current) return { ok: false, reason: 'not_found', message: 'Command not found' };
  if (current.adminId !== actor.email) {
    return { ok: false, reason: 'forbidden', message: 'Only the admin who issued this command can confirm it', command: current };
  }
  const required = current.confirmation.requiredPhrase;
  if (required && typedPhrase?.trim() !== required) {
    return { ok: false, reason: 'confirmation_mismatch', message: `Type "${required}" to confirm`, command: current };
  }
  return move(commandId, 'confirmed', {
    confirmation: { ...current.confirmation, confirmedAt: nowIso(), confirmedBy: actor.email },
  });
}

/**
 * Claims a confirmed command for execution. Atomic: of any number of concurrent callers exactly one
 * gets ok:true; the others get `already_claimed` (or `invalid_transition` once it has finished).
 */
export function beginExecution(commandId: string): Promise<AiCommandResult> {
  return move(commandId, 'executing', { execution: { startedAt: nowIso(), finishedAt: null, result: null } });
}

/** Records success with the audit-log entry (or entries) the shared service wrote. */
export async function completeExecution(
  commandId: string,
  outcome: { auditIds: string[]; result?: unknown },
): Promise<AiCommandResult> {
  const current = await findAiCommand({ commandId });
  return move(commandId, 'executed', {
    auditId: outcome.auditIds[outcome.auditIds.length - 1] ?? null,
    auditIds: outcome.auditIds,
    execution: { startedAt: current?.execution?.startedAt ?? null, finishedAt: nowIso(), result: outcome.result ?? null },
  });
}

export async function failExecution(
  commandId: string,
  error: { code: string; message: string; details?: unknown },
  auditIds: string[] = [],
): Promise<AiCommandResult> {
  const current = await findAiCommand({ commandId });
  return move(commandId, 'failed', {
    error: { ...error, at: nowIso() },
    auditIds,
    auditId: auditIds[auditIds.length - 1] ?? null,
    execution: { startedAt: current?.execution?.startedAt ?? null, finishedAt: nowIso(), result: null },
  });
}

export function rejectCommand(commandId: string, error: { code: string; message: string; details?: unknown }): Promise<AiCommandResult> {
  return move(commandId, 'rejected', { error: { ...error, at: nowIso() } });
}

export function cancelCommand(commandId: string): Promise<AiCommandResult> {
  return move(commandId, 'cancelled');
}

export function expireCommand(commandId: string): Promise<AiCommandResult> {
  return move(commandId, 'expired');
}
