/**
 * AI Admin — conversational command orchestrator.
 *
 *   message → interpret (untrusted) → schema-validate → command state → normalize → resolve entities →
 *   required fields → business validation → preview → confirmation → execute (shared service) → audit → report
 *
 * The interpreter only proposes an intent and parameters. Everything else — which fields are required, what
 * a reference means, whether it is allowed, the preview, the confirmation and the execution — is decided
 * here and in the action definitions. One pending command per conversation; corrections update it.
 */
import { randomUUID } from 'node:crypto';
import {
  AI_ACTION_POLICIES,
  AI_PENDING_STATUSES,
  aiInterpretationSchema,
  canTransition,
  istDateKey,
  type AiActionName,
  type AiCommandRecord,
  type AiCommandStatus,
  type AiCommandView,
  type AiHistoryItem,
  type AiInterpretation,
  type AiMessage,
  type AiMessageInput,
  type AiParamValue,
  type AiSessionRecord,
  type AiSessionView,
} from '@iitj1/types';
import {
  findAiCommand,
  getAiSession,
  getLatestAiSession,
  insertAiCommand,
  insertAiSession,
  listAiCommands,
  transitionAiCommand,
  updateAiSession,
} from '../../store';
import { captureAuditIdsInto } from '../../store/auditCapture';
import { config } from '../../config';
import { ACTIONS, type ActionContext } from './actions';
import { ActionError } from './actions/types';
import { evaluate, normalizeParams, type Evaluation } from './engine';
import { getInterpreter } from './providers';
import { answerQuery } from './queries';

export interface AiAdmin {
  email: string;
  role: string;
}

/** Roles that may use AI Admin at all, and the stricter rule for HIGH-risk actions. */
export const AI_ADMIN_ROLES = ['superadmin', 'editor'];
const HIGH_RISK_ROLES = ['superadmin'];

const MAX_MESSAGES = 100;
const RECENT_FOR_INTERPRETER = 6;
const PREVIEW_TTL_MS = 30 * 60_000;

export const HELP_TEXT =
  'I can post, edit or delete notices; change or schedule mess prices; create temporary meal updates for substitutions, unavailable dishes, special menus and timings; post or edit transport alerts; cancel a bus trip; and add, change or remove holidays. ' +
  'You can also ask things like “What buses run tomorrow?” or “What is the current Pay & Use price?” For laundry, Wi-Fi, health-center or directory changes, use the corresponding admin page.';

// ─── Views ──────────────────────────────────────────────────────────────────────

function commandView(c: AiCommandRecord): AiCommandView {
  return {
    commandId: c.commandId,
    action: c.action,
    actionLabel: AI_ACTION_POLICIES[c.action].label,
    status: c.status,
    parameters: c.parameters,
    missingFields: c.missingFields,
    question: c.question,
    resolvedEntities: c.resolvedEntities,
    validationResult: c.validationResult,
    preview: c.preview,
    previewToken: c.status === 'awaiting_confirmation' ? c.previewToken : null,
    riskLevel: c.riskLevel,
    confirmationRequired: c.confirmationRequired,
    confirmationStatus: c.confirmationStatus,
    executionStatus: c.status,
    auditId: c.auditId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function sessionView(s: AiSessionRecord): Promise<AiSessionView> {
  const active = s.activeCommandId ? await findAiCommand({ commandId: s.activeCommandId }) : null;
  return {
    sessionId: s.sessionId,
    adminId: s.adminId,
    messages: s.messages,
    activeCommand: active ? commandView(active) : null,
    provider: getInterpreter().name,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function listHistory(campusId: string, limit = 20): Promise<AiHistoryItem[]> {
  return (await listAiCommands(campusId, limit)).map((c) => ({
    commandId: c.commandId,
    summary: c.execution?.summary ?? c.preview?.title ?? c.originalPrompt.slice(0, 80),
    action: c.action,
    actionLabel: AI_ACTION_POLICIES[c.action].label,
    status: c.status,
    adminId: c.adminId,
    auditId: c.auditId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

// ─── Sessions ───────────────────────────────────────────────────────────────────

export async function startSession(admin: AiAdmin, campusId: string): Promise<AiSessionView> {
  const now = new Date().toISOString();
  const session: AiSessionRecord = {
    sessionId: randomUUID(),
    campusId,
    adminId: admin.email,
    messages: [],
    activeCommandId: null,
    processedClientIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await insertAiSession(session);
  return sessionView(session);
}

export async function getLatestSession(admin: AiAdmin, campusId: string): Promise<AiSessionView | null> {
  const s = await getLatestAiSession(admin.email, campusId);
  return s ? sessionView(s) : null;
}

/** Sessions are private to the admin who started them (others get "not found"). */
async function ownSession(sessionId: string, admin: AiAdmin): Promise<AiSessionRecord | null> {
  const s = await getAiSession(sessionId);
  return s && s.adminId === admin.email ? s : null;
}

export async function getSession(sessionId: string, admin: AiAdmin): Promise<AiSessionView | null> {
  const s = await ownSession(sessionId, admin);
  return s ? sessionView(s) : null;
}

// ─── Command state ──────────────────────────────────────────────────────────────

class ConcurrentChangeError extends Error {}

/** Enforced transition with optimistic locking on `revision`. */
async function moveTo(cmd: AiCommandRecord, to: AiCommandStatus, set: Partial<AiCommandRecord>): Promise<AiCommandRecord> {
  if (!canTransition(cmd.status, to)) throw new Error(`Illegal AI command transition ${cmd.status} → ${to}`);
  const next = await transitionAiCommand(cmd.commandId, [cmd.status], { ...set, status: to, revision: cmd.revision + 1, updatedAt: new Date().toISOString() }, { revision: cmd.revision });
  if (!next) throw new ConcurrentChangeError('The command changed while this request was processed');
  return next;
}

function contextFor(cmd: Pick<AiCommandRecord, 'campusId' | 'commandId'>, admin: AiAdmin): ActionContext {
  const now = new Date();
  return { campusId: cmd.campusId, today: istDateKey(now), now, admin, commandId: cmd.commandId };
}

/** Applies an evaluation to the command: asking, invalid, or a fresh preview awaiting confirmation. */
async function applyEvaluation(cmd: AiCommandRecord, ev: Evaluation): Promise<AiCommandRecord> {
  const common = { parameters: ev.params, resolvedEntities: ev.entities };
  if (ev.kind !== 'ready') {
    return moveTo(cmd, 'collecting_information', {
      ...common,
      missingFields: ev.kind === 'question' ? ev.missingFields : [],
      question: ev.kind === 'question' ? ev.question : null,
      validationResult: ev.errors.length ? { ok: false, errors: ev.errors } : null,
      preview: null,
      previewToken: null,
      previewedAt: null,
      confirmationStatus: 'not_requested',
    });
  }
  let c = cmd;
  if (c.status === 'awaiting_confirmation') c = await moveTo(c, 'collecting_information', common);
  c = await moveTo(c, 'ready_for_preview', { ...common, missingFields: [], question: null, validationResult: { ok: true, errors: [] } });
  return moveTo(c, 'awaiting_confirmation', {
    preview: ev.preview,
    previewToken: randomUUID(),
    previewedAt: new Date().toISOString(),
    confirmationStatus: 'pending',
  });
}

/** The assistant's reply for the command's current state. */
function replyFor(cmd: AiCommandRecord, intro?: string): Omit<AiMessage, 'id' | 'at' | 'role'> {
  const prefix = intro ? `${intro} ` : '';
  if (cmd.status === 'collecting_information') {
    if (cmd.question) {
      return { kind: 'question', text: prefix + cmd.question.text, commandId: cmd.commandId, options: cmd.question.options, optionField: cmd.question.field };
    }
    return { kind: 'error', text: `${prefix}${(cmd.validationResult?.errors ?? []).join(' ')} What would you like to change?`, commandId: cmd.commandId };
  }
  if (cmd.status === 'awaiting_confirmation' && cmd.preview) {
    let ask: string;
    if (cmd.action === 'cancel_bus_trip') {
      const route = cmd.parameters.route ? String(cmd.parameters.route) : 'the bus';
      const time = cmd.parameters.time ? String(cmd.parameters.time) : '';
      const date = cmd.parameters.date ? String(cmd.parameters.date) : '';
      const todayStr = istDateKey(new Date());
      const dateText = date === todayStr ? 'today' : 'tomorrow';
      ask = `I’ll cancel ${route} at ${time} ${dateText} and notify students with a campus announcement. Please review this carefully and press “${cmd.preview.confirmLabel}” to go ahead.`;
    } else {
      ask =
        cmd.riskLevel === 'high'
          ? `Please review this carefully and press “${cmd.preview.confirmLabel}” to go ahead.`
          : `Please check this and confirm.`;
    }
    return { kind: 'preview', text: prefix + ask, commandId: cmd.commandId, preview: cmd.preview, previewToken: cmd.previewToken ?? undefined };
  }
  if (cmd.status === 'rejected') return { kind: 'error', text: prefix + (cmd.error?.message ?? 'I can’t do that.'), commandId: cmd.commandId };
  return { kind: 'info', text: prefix.trim() || 'Okay.', commandId: cmd.commandId };
}

async function createCommand(session: AiSessionRecord, admin: AiAdmin, action: AiActionName, prompt: string): Promise<AiCommandRecord> {
  const now = new Date().toISOString();
  const commandId = randomUUID();
  const policy = AI_ACTION_POLICIES[action];
  const cmd: AiCommandRecord = {
    commandId,
    sessionId: session.sessionId,
    campusId: session.campusId,
    adminId: admin.email,
    adminRole: admin.role,
    originalPrompt: prompt.slice(0, 1000),
    action,
    parameters: {},
    missingFields: [],
    question: null,
    resolvedEntities: [],
    validationResult: null,
    preview: null,
    previewToken: null,
    previewedAt: null,
    riskLevel: policy.risk,
    confirmationRequired: true,
    confirmationStatus: 'not_requested',
    confirmedAt: null,
    confirmedBy: null,
    status: 'collecting_information',
    execution: null,
    auditId: null,
    auditIds: [],
    error: null,
    idempotencyKey: commandId,
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };
  await insertAiCommand(cmd);
  return cmd;
}

/** Normalizes new parameters, merges them into the command and re-evaluates. */
async function updateParameters(cmd: AiCommandRecord, admin: AiAdmin, raw: Record<string, AiParamValue>): Promise<AiCommandRecord> {
  const ctx = contextFor(cmd, admin);
  const { params, errors } = normalizeParams(cmd.action, raw, ctx);
  const merged = { ...cmd.parameters, ...params };
  for (const field of Object.keys(errors)) delete merged[field];
  const ev = await evaluate(cmd.action, merged, ctx, errors);
  return applyEvaluation(cmd, ev);
}

// ─── Messages ───────────────────────────────────────────────────────────────────

export type MessageOutcome = { ok: true; view: AiSessionView } | { ok: false; status: 404 | 409 | 429; error: string };

const rate = new Map<string, number[]>();
function rateLimited(adminId: string): boolean {
  const now = Date.now();
  const recent = (rate.get(adminId) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  rate.set(adminId, recent);
  return recent.length > config.ai.messagesPerMinute;
}

function message(role: AiMessage['role'], body: Omit<AiMessage, 'id' | 'at' | 'role'>): AiMessage {
  return { id: randomUUID(), role, at: new Date().toISOString(), ...body };
}

async function interpret(session: AiSessionRecord, pending: AiCommandRecord | null, text: string): Promise<AiInterpretation | null> {
  try {
    const raw = await getInterpreter().interpret({
      message: text,
      recentMessages: session.messages.slice(-RECENT_FOR_INTERPRETER).map((m) => ({ role: m.role, text: m.text.slice(0, 300) })),
      pending: pending
        ? {
            action: pending.action,
            collected: pending.parameters,
            missingFields: pending.missingFields,
            askedField: pending.question?.field ?? null,
            awaitingConfirmation: pending.status === 'awaiting_confirmation',
          }
        : null,
      today: istDateKey(),
    });
    const parsed = aiInterpretationSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function handleMessage(sessionId: string, admin: AiAdmin, input: AiMessageInput): Promise<MessageOutcome> {
  const session = await ownSession(sessionId, admin);
  if (!session) return { ok: false, status: 404, error: 'Conversation not found' };
  if (input.clientMessageId && session.processedClientIds.includes(input.clientMessageId)) {
    return { ok: true, view: await sessionView(session) }; // retried request — already handled
  }
  if (rateLimited(admin.email)) return { ok: false, status: 429, error: 'Too many messages — please wait a moment.' };

  const active = session.activeCommandId ? await findAiCommand({ commandId: session.activeCommandId }) : null;
  const pending = active && AI_PENDING_STATUSES.includes(active.status) ? active : null;
  const adminText = input.text ?? input.select?.value ?? '';
  const selectedLabel = input.select ? pending?.question?.options?.find((o) => o.value === input.select!.value)?.label : undefined;
  const added: AiMessage[] = [message('admin', { text: (selectedLabel ?? adminText).slice(0, 1000) })];
  let activeCommandId: string | null = pending?.commandId ?? null;
  const reply = (body: Omit<AiMessage, 'id' | 'at' | 'role'>) => added.push(message('assistant', body));

  try {
    if (input.select) {
      // A click on an option the backend offered — applied directly, still fully validated.
      if (!pending || pending.question?.field !== input.select.field) {
        reply({ kind: 'error', text: 'That choice is no longer active.' });
      } else {
        const updated = await updateParameters(pending, admin, { [input.select.field]: input.select.value });
        reply(replyFor(updated));
      }
    } else {
      const it = await interpret(session, pending, adminText);
      if (!it) {
        reply({ kind: 'error', text: 'Sorry — I couldn’t work out what you meant. Could you rephrase it?' });
      } else {
        activeCommandId = await dispatch(it, { session, admin, pending, text: adminText, reply });
      }
    }
  } catch (err) {
    if (!(err instanceof ConcurrentChangeError)) throw err;
    reply({ kind: 'error', text: 'That request changed in another window. Please check the latest state and try again.' });
  }

  const now = new Date().toISOString();
  const updated = await updateAiSession(session.sessionId, {
    messages: [...session.messages, ...added].slice(-MAX_MESSAGES),
    activeCommandId,
    processedClientIds: input.clientMessageId ? [...session.processedClientIds, input.clientMessageId].slice(-50) : session.processedClientIds,
    updatedAt: now,
  });
  return { ok: true, view: await sessionView(updated ?? session) };
}

interface DispatchContext {
  session: AiSessionRecord;
  admin: AiAdmin;
  pending: AiCommandRecord | null;
  text: string;
  reply: (body: Omit<AiMessage, 'id' | 'at' | 'role'>) => void;
}

/** Acts on a validated interpretation. Returns the session's active command id afterwards. */
async function dispatch(it: AiInterpretation, d: DispatchContext): Promise<string | null> {
  const { pending, admin, reply } = d;
  switch (it.intent) {
    case 'help':
      reply({ kind: 'info', text: HELP_TEXT });
      return pending?.commandId ?? null;

    case 'unsupported':
      reply({ kind: 'info', text: `I can’t do that from here. ${HELP_TEXT}` });
      return pending?.commandId ?? null;

    case 'query': {
      const ctx = { today: istDateKey() };
      // Reuse the mess fields' normalization for "non-veg", "pay & use", etc.
      const params = it.query === 'mess_pricing' ? normalizeParams('update_mess_pricing', it.parameters ?? {}, contextFor({ campusId: d.session.campusId, commandId: '' }, admin)).params : (it.parameters ?? {});
      reply({ kind: 'answer', text: await answerQuery(it.query!, params, d.session.campusId, ctx.today) });
      return pending?.commandId ?? null;
    }

    case 'cancel_pending': {
      if (!pending) {
        reply({ kind: 'info', text: 'There’s nothing pending to cancel.' });
        return null;
      }
      await moveTo(pending, 'cancelled', { question: null, previewToken: null });
      reply({ kind: 'info', text: 'Okay — cancelled. Nothing was changed.', commandId: pending.commandId });
      return null;
    }

    case 'confirm': {
      if (!pending || pending.status !== 'awaiting_confirmation') {
        if (pending?.question) reply(replyFor(pending, 'I still need one thing first.'));
        else reply({ kind: 'info', text: 'There’s nothing waiting for confirmation.' });
        return pending?.commandId ?? null;
      }
      if (pending.riskLevel === 'high') {
        reply({ kind: 'info', text: `For this change, please press “${pending.preview?.confirmLabel ?? 'Confirm'}” on the preview card.`, commandId: pending.commandId });
        return pending.commandId;
      }
      const result = await confirmAndExecute(pending.commandId, admin, pending.previewToken ?? '', { sessionAlreadyUpdating: true });
      reply(result.reply);
      return result.keepActive ? pending.commandId : null;
    }

    case 'update_pending':
    case 'command': {
      const action = it.action ?? (it.intent === 'update_pending' ? pending?.action : undefined);
      if (!action) {
        reply({ kind: 'info', text: `What would you like to do? ${HELP_TEXT}` });
        return null;
      }
      if (pending && pending.action === action) {
        const updated = await updateParameters(pending, admin, it.parameters ?? {});
        const changed = pending.status === 'awaiting_confirmation' && updated.status === 'awaiting_confirmation';
        reply(replyFor(updated, changed ? 'Updated.' : undefined));
        return updated.commandId;
      }
      let intro: string | undefined;
      if (pending) {
        await moveTo(pending, 'cancelled', { question: null, previewToken: null });
        intro = `Okay — I’ve dropped the earlier “${AI_ACTION_POLICIES[pending.action].label.toLowerCase()}” request.`;
      }
      const created = await createCommand(d.session, admin, action, d.text);
      if (AI_ACTION_POLICIES[action].risk === 'high' && !HIGH_RISK_ROLES.includes(admin.role)) {
        const rejected = await moveTo(created, 'rejected', {
          error: { code: 'forbidden', message: 'Only a superadmin can do this from AI Admin.', at: new Date().toISOString() },
        });
        reply(replyFor(rejected, intro));
        return null;
      }
      const updated = await updateParameters(created, admin, it.parameters ?? {});
      reply(replyFor(updated, intro));
      return updated.commandId;
    }
  }
}

// ─── Confirmation & execution ───────────────────────────────────────────────────

export interface ConfirmOutcome {
  ok: boolean;
  status: 200 | 403 | 404 | 409;
  code: 'executed' | 'already_executed' | 'failed' | 'not_found' | 'forbidden' | 'not_awaiting' | 'in_progress' | 'stale_preview' | 'preview_changed';
  reply: Omit<AiMessage, 'id' | 'at' | 'role'>;
  keepActive: boolean;
  command?: AiCommandView;
}

/**
 * Executes a command only if: it belongs to this admin, it is awaiting confirmation, the confirmation quotes
 * the CURRENT preview, re-evaluation against current data still produces that same preview, and this
 * request wins the atomic awaiting_confirmation → executing claim. Repeats return the original outcome.
 */
export async function confirmAndExecute(
  commandId: string,
  admin: AiAdmin,
  previewToken: string,
  opts: { sessionAlreadyUpdating?: boolean } = {},
): Promise<ConfirmOutcome> {
  const cmd = await findAiCommand({ commandId });
  const out = (status: ConfirmOutcome['status'], code: ConfirmOutcome['code'], text: string, c?: AiCommandRecord, keepActive = false): ConfirmOutcome => ({
    ok: code === 'executed' || code === 'already_executed',
    status,
    code,
    reply: { kind: code === 'executed' ? 'result' : code === 'failed' ? 'error' : 'info', text, commandId, ...(c?.auditId ? { auditId: c.auditId } : {}) },
    keepActive,
    ...(c ? { command: commandView(c) } : {}),
  });
  if (!cmd) return out(404, 'not_found', 'Command not found.');
  if (cmd.adminId !== admin.email) return out(403, 'forbidden', 'Only the admin who started this can confirm it.');
  if (cmd.status === 'executed') return out(200, 'already_executed', cmd.execution?.summary ? `Already done — ${cmd.execution.summary}.` : 'Already done.', cmd);
  if (cmd.status === 'executing') return out(409, 'in_progress', 'This is already being carried out.', cmd);
  if (cmd.status !== 'awaiting_confirmation') return out(409, 'not_awaiting', 'There’s nothing to confirm for this request.', cmd);
  if (!cmd.previewToken || cmd.previewToken !== previewToken) {
    return out(409, 'stale_preview', 'The preview has changed since you saw it — please review the latest one.', cmd, true);
  }

  // Re-check against current data: if anything moved (or the preview is old), show a fresh preview instead.
  const ctx = contextFor(cmd, admin);
  const ev = await evaluate(cmd.action, cmd.parameters, ctx);
  const expired = !cmd.previewedAt || Date.now() - new Date(cmd.previewedAt).getTime() > PREVIEW_TTL_MS;
  if (ev.kind !== 'ready' || expired || JSON.stringify(ev.preview) !== JSON.stringify(cmd.preview)) {
    const refreshed = await applyEvaluation(cmd, ev);
    const r = replyFor(refreshed, 'Things changed since that preview, so nothing was done yet.');
    if (!opts.sessionAlreadyUpdating) await appendToSession(cmd.sessionId, [message('assistant', r)]);
    return { ...out(409, 'preview_changed', r.text, refreshed, true), reply: r };
  }

  // The atomic claim: only one request can move this preview to `executing`.
  const startedAt = new Date().toISOString();
  const claimed = await transitionAiCommand(
    commandId,
    ['awaiting_confirmation'],
    {
      status: 'executing',
      confirmationStatus: 'confirmed',
      confirmedAt: startedAt,
      confirmedBy: admin.email,
      execution: { startedAt, finishedAt: null, summary: null },
      revision: cmd.revision + 1,
      updatedAt: startedAt,
    },
    { previewToken },
  );
  if (!claimed) {
    const now = await findAiCommand({ commandId });
    if (now?.status === 'executed') return out(200, 'already_executed', `Already done — ${now.execution?.summary ?? ''}.`, now);
    return out(409, 'in_progress', 'This is already being carried out.', now ?? undefined);
  }

  const auditIds: string[] = [];
  let final: AiCommandRecord;
  let text: string;
  try {
    const result = await captureAuditIdsInto(auditIds, () => ACTIONS[cmd.action].execute(ev.effective, ev.resolution, ctx));
    final = await moveTo(claimed, 'executed', {
      auditIds,
      auditId: auditIds[auditIds.length - 1] ?? null,
      execution: { startedAt, finishedAt: new Date().toISOString(), summary: result.summary },
    });
    text = result.message;
  } catch (err) {
    const safe = err instanceof ActionError ? err.message : 'Something went wrong while saving. Please check the relevant admin page.';
    final = await moveTo(claimed, 'failed', {
      auditIds,
      auditId: auditIds[auditIds.length - 1] ?? null,
      error: { code: err instanceof ActionError ? 'action_failed' : 'internal_error', message: safe, at: new Date().toISOString() },
      execution: { startedAt, finishedAt: new Date().toISOString(), summary: null },
    });
    text = `That didn’t work: ${safe}`;
  }
  const result = out(200, final.status === 'executed' ? 'executed' : 'failed', text, final);
  if (!opts.sessionAlreadyUpdating) await appendToSession(cmd.sessionId, [message('assistant', result.reply)], commandId);
  return result;
}

export async function cancelCommand(commandId: string, admin: AiAdmin): Promise<{ status: 200 | 403 | 404 | 409; command?: AiCommandView; error?: string }> {
  const cmd = await findAiCommand({ commandId });
  if (!cmd) return { status: 404, error: 'Command not found' };
  if (cmd.adminId !== admin.email) return { status: 403, error: 'Only the admin who started this can cancel it' };
  if (!AI_PENDING_STATUSES.includes(cmd.status)) return { status: 409, error: `This request is already ${cmd.status.replace('_', ' ')}`, command: commandView(cmd) };
  const cancelled = await moveTo(cmd, 'cancelled', { question: null, previewToken: null });
  await appendToSession(cmd.sessionId, [message('assistant', { kind: 'info', text: 'Okay — cancelled. Nothing was changed.', commandId })], commandId);
  return { status: 200, command: commandView(cancelled) };
}

/** Adds assistant messages; `finished` clears the session's active command if it is that one. */
async function appendToSession(sessionId: string, msgs: AiMessage[], finished?: string): Promise<void> {
  const s = await getAiSession(sessionId);
  if (!s) return;
  await updateAiSession(sessionId, {
    messages: [...s.messages, ...msgs].slice(-MAX_MESSAGES),
    activeCommandId: finished && s.activeCommandId === finished ? null : s.activeCommandId,
    updatedAt: new Date().toISOString(),
  });
}
