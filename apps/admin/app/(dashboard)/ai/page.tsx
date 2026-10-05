'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { AiCommandStatus, AiHistoryItem, AiMessage, AiPreview, AiSessionView } from '@iitj1/types';
import { ApiError, apiFetch, campusId } from '@/lib/api';
import { Button } from '@/components/Button';
import { Card, EmptyState, LoadingBlock, PageHeader, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';

const QUICK_STARTERS = [
  "Cancel tomorrow's B2 bus",
  "Tomorrow breakfast paneer is unavailable, serve aloo instead",
  "Change tomorrow's dinner menu",
  'Change Pay & Use dinner non-veg to ₹90 tomorrow',
  'Post a notice saying the library closes at 6 PM today',
  'What buses are running tomorrow?',
  'What transport alerts are active?',
];


const STATUS_MAP: Record<AiCommandStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  collecting_information: { label: 'Collecting details', tone: 'info' },
  ready_for_preview: { label: 'Ready', tone: 'info' },
  awaiting_confirmation: { label: 'Awaiting confirmation', tone: 'warning' },
  executing: { label: 'Executing', tone: 'info' },
  executed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  rejected: { label: 'Rejected', tone: 'danger' },
  failed: { label: 'Failed', tone: 'danger' },
};

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object') {
    const body = err.body as { message?: string; error?: string };
    return body.message ?? body.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

function clientId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * High-fidelity Command Preview Card.
 * Renders structured preview details, visual route chips, warnings, and explicit confirmation actions.
 */
function OperationPreviewCard({
  preview,
  actionable,
  busy,
  onConfirm,
  onCancel,
}: {
  preview: AiPreview;
  actionable: boolean;
  busy: 'confirm' | 'cancel' | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isHighRisk = preview.risk === 'high';
  const isCancellation = preview.title.toLowerCase().includes('cancel');

  return (
    <div
      className={`mt-3 overflow-hidden rounded-2xl border-2 transition-all ${
        isHighRisk
          ? 'border-non-veg/50 bg-gradient-to-b from-white to-non-veg/[0.03] shadow-md'
          : 'border-indigo/40 bg-gradient-to-b from-white to-indigo/[0.02] shadow-sm'
      } ${actionable ? 'ring-2 ring-indigo/10' : 'opacity-80'}`}
    >
      {/* Header bar */}
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${isHighRisk ? 'border-non-veg/20 bg-non-veg/5' : 'border-indigo/15 bg-indigo-tint/40'}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${isHighRisk ? 'bg-non-veg text-white' : 'bg-indigo text-white'}`}>
            {isCancellation ? 'Cancellation Preview' : 'Operation Preview'}
          </span>
          {preview.subtitle ? <span className="text-xs text-muted">({preview.subtitle})</span> : null}
        </div>
        <span className="text-xs font-medium text-muted">
          {isHighRisk ? '⚠ Requires Superadmin Confirmation' : 'Confirmation Required'}
        </span>
      </div>

      {/* Main card body */}
      <div className="p-4 sm:p-5">
        <h3 className="text-lg font-bold text-ink">{preview.title}</h3>
        {preview.subtitle ? <p className="mt-0.5 text-sm font-medium text-muted">{preview.subtitle}</p> : null}

        <div className="mt-4 grid gap-2.5 text-sm">
          {preview.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-1 rounded-xl bg-surface/60 p-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4 sm:bg-transparent sm:p-1">
              <span className="font-medium text-muted">{row.label}</span>
              <div className="text-ink">
                {row.before !== undefined ? (
                  <span className="mr-2 text-muted line-through">{row.before} →</span>
                ) : null}
                <span className="font-semibold text-ink whitespace-pre-line">{row.value}</span>
              </div>
            </div>
          ))}

          {preview.notification ? (
            <div className="grid grid-cols-1 rounded-xl bg-surface/60 p-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4 sm:bg-transparent sm:p-1">
              <span className="font-medium text-muted">Notification</span>
              <span className="text-xs text-muted sm:text-sm">{preview.notification}</span>
            </div>
          ) : null}
        </div>

        {/* Warning callout */}
        {preview.warnings.length > 0 && (
          <div className={`mt-4 space-y-1.5 rounded-xl border p-3.5 text-sm ${isHighRisk ? 'border-non-veg/30 bg-non-veg/10 text-non-veg' : 'border-sandstone/30 bg-sandstone-tint text-sandstone'}`}>
            {preview.warnings.map((w) => (
              <div key={w} className="flex items-start gap-2">
                <span className="text-base leading-none">⚠</span>
                <span className="font-medium">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        {actionable ? (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
            <Button
              variant="secondary"
              onClick={onCancel}
              loading={busy === 'cancel'}
              disabled={busy !== null}
              className="px-4"
            >
              Go Back
            </Button>
            <Button
              variant={isHighRisk ? 'danger' : 'primary'}
              onClick={onConfirm}
              loading={busy === 'confirm'}
              disabled={busy !== null}
              className="px-5 font-semibold"
            >
              {preview.confirmLabel || (isCancellation ? 'Confirm Cancellation' : 'Confirm & Execute')}
            </Button>
          </div>
        ) : (
          <div className="mt-3 border-t border-border/60 pt-2 text-right">
            <span className="text-xs text-muted">Preview state archived</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiAdminPage() {
  const { push } = useToast();
  const [session, setSession] = useState<AiSessionView | null>(null);
  const [history, setHistory] = useState<AiHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const [copiedAuditId, setCopiedAuditId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiFetch<{ commands: AiHistoryItem[] }>('/admin/ai/commands', {
        query: { campus: campusId, limit: '20', _cb: Date.now().toString() },
      });
      setHistory(res.commands);
    } catch {
      /* non-blocking background history load */
    }
  }, []);

  const newSession = useCallback(async () => {
    const res = await apiFetch<{ session: AiSessionView }>('/admin/ai/sessions', {
      method: 'POST',
      body: { campusId },
    });
    setSession(res.session);
  }, []);

  const refreshSession = useCallback(async (id: string) => {
    const res = await apiFetch<{ session: AiSessionView }>(`/admin/ai/sessions/${id}`, {
      query: { _cb: Date.now().toString() },
    });
    setSession(res.session);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ session: AiSessionView | null }>('/admin/ai/sessions/latest', {
          query: { campus: campusId, _cb: Date.now().toString() },
        });
        if (res.session) setSession(res.session);
        else await newSession();
      } catch (err) {
        push('error', 'AI Command Center Unavailable', errorText(err));
      } finally {
        setLoading(false);
      }
    })();
    void loadHistory();
  }, [newSession, loadHistory, push]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session?.messages.length, sending]);

  const send = useCallback(
    async (body: { text?: string; select?: { field: string; value: string } }) => {
      if (!session || sending) return;
      setSending(true);
      try {
        const res = await apiFetch<{ session: AiSessionView }>(`/admin/ai/sessions/${session.sessionId}/messages`, {
          method: 'POST',
          body: { ...body, clientMessageId: clientId() },
        });
        setSession(res.session);
        if (body.text) setText('');
        void loadHistory();
      } catch (err) {
        push('error', 'Message Failed', errorText(err));
      } finally {
        setSending(false);
      }
    },
    [session, sending, loadHistory, push],
  );

  const active = session?.activeCommand ?? null;

  const handleConfirm = async () => {
    if (!session || !active?.previewToken) return;
    setBusy('confirm');
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(`/admin/ai/commands/${active.commandId}/confirm`, {
        method: 'POST',
        body: { previewToken: active.previewToken },
      });
      push(res.ok ? 'success' : 'error', res.ok ? 'Command Executed' : 'Execution Failed', res.message);
    } catch (err) {
      push('error', 'Execution Error', errorText(err));
    } finally {
      setBusy(null);
      await refreshSession(session.sessionId).catch(() => undefined);
      void loadHistory();
    }
  };

  const handleCancel = async () => {
    if (!session || !active) return;
    setBusy('cancel');
    try {
      await apiFetch(`/admin/ai/commands/${active.commandId}/cancel`, { method: 'POST' });
      push('info', 'Command Cancelled', 'The pending operation was abandoned. No changes were made.');
    } catch (err) {
      push('error', 'Cancel Error', errorText(err));
    } finally {
      setBusy(null);
      await refreshSession(session.sessionId).catch(() => undefined);
      void loadHistory();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (t) void send({ text: t });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const t = text.trim();
      if (t) void send({ text: t });
    }
  };

  const copyAuditId = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(id);
      setCopiedAuditId(id);
      setTimeout(() => setCopiedAuditId(null), 2500);
      push('info', 'Copied', `Audit ID ${id} copied to clipboard`);
    }
  };

  const messages = session?.messages ?? [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="AI Admin Command Center"
        subtitle="Manage institute transport, mess pricing, notices, and holidays through authoritative conversational commands."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-sage animate-pulse" />
              Engine: {session?.provider ?? 'rules'}
            </span>
            <Button
              variant="secondary"
              onClick={() => void newSession().catch((err) => push('error', 'Session Reset Failed', errorText(err)))}
              disabled={loading || sending}
            >
              + New Session
            </Button>
          </div>
        }
      />

      {/* Main Command Console Container */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Active Command HUD Banner */}
          {active && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo/30 bg-gradient-to-r from-indigo-tint/50 to-surface p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo text-white font-bold">
                  ⚡
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{active.actionLabel}</span>
                    <StatusPill label={STATUS_MAP[active.status].label} tone={STATUS_MAP[active.status].tone} />
                  </div>
                  <p className="text-xs text-muted">
                    {active.status === 'awaiting_confirmation'
                      ? 'Preview generated. Review details and confirm.'
                      : active.question
                        ? `Required: ${active.question.field}`
                        : 'Processing parameters...'}
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => void handleCancel()} disabled={busy !== null} className="text-xs h-8">
                Abandon Request
              </Button>
            </div>
          )}

          {/* Conversation Feed */}
          <Card className="flex flex-col">
            {loading ? (
              <LoadingBlock />
            ) : (
              <div className="flex flex-col">
                <div className="max-h-[62vh] min-h-[18rem] space-y-4 overflow-y-auto pr-1 scroll-thin" aria-live="polite">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-tint text-2xl text-indigo mb-3">
                        💬
                      </div>
                      <h3 className="text-base font-semibold text-ink">What would you like to do?</h3>
                      <p className="mt-1 max-w-md text-sm text-muted">
                        Type an operational request or pick a common action below. No changes are applied until you inspect the preview card and confirm.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
                        {QUICK_STARTERS.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            onClick={() => setText(starter)}
                            className="rounded-full border border-border/80 bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:border-indigo/40 hover:bg-indigo-tint/40"
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => {
                      if (m.role === 'admin') {
                        return (
                          <div key={m.id} className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo px-4 py-2.5 text-sm text-white shadow-sm">
                              <p className="whitespace-pre-line">{m.text}</p>
                              <span className="mt-1 block text-right text-[10px] text-white/70">{formatTime(m.at)}</span>
                            </div>
                          </div>
                        );
                      }

                      const isCurrentPreview =
                        !!m.previewToken && active?.status === 'awaiting_confirmation' && active.previewToken === m.previewToken;
                      const showInteractiveOptions =
                        m === lastAssistant && !!m.options?.length && active?.question?.field === m.optionField;

                      return (
                        <div key={m.id} className="flex justify-start">
                          <div className="max-w-[95%] sm:max-w-[88%] space-y-2">
                            {/* Message text bubble */}
                            <div
                              className={`rounded-2xl rounded-bl-md border px-4 py-3 text-sm shadow-sm ${
                                m.kind === 'error'
                                  ? 'border-non-veg/30 bg-non-veg/5 text-ink'
                                  : m.kind === 'result'
                                    ? 'border-sage/40 bg-sage/10 text-ink'
                                    : m.kind === 'question'
                                      ? 'border-indigo/30 bg-surface text-ink'
                                      : 'border-border bg-surface text-ink'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                  {m.kind === 'result' ? '✓ Executed' : m.kind === 'error' ? '⚠ Notice' : 'AI Assistant'}
                                </span>
                                <span className="text-[10px] text-muted">{formatTime(m.at)}</span>
                              </div>
                              <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                              {/* Audit trail reference on executed operations */}
                              {m.auditId && (
                                <div className="mt-2.5 flex items-center gap-2 border-t border-sage/20 pt-2 text-xs">
                                  <span className="text-muted">Audit Record:</span>
                                  <button
                                    type="button"
                                    onClick={() => copyAuditId(m.auditId!)}
                                    className="font-mono text-xs text-indigo underline hover:text-indigo-dark"
                                    title="Click to copy audit reference"
                                  >
                                    #{m.auditId.slice(-8)}
                                  </button>
                                  {copiedAuditId === m.auditId && <span className="text-sage text-[11px]">Copied</span>}
                                </div>
                              )}
                            </div>

                            {/* Selectable Options Pills (e.g. [5:00 PM] [8:00 PM]) */}
                            {showInteractiveOptions && m.options && (
                              <div className="flex flex-col gap-1.5 pt-1">
                                <span className="text-xs font-semibold text-muted">Select an option:</span>
                                <div className="flex flex-wrap gap-2">
                                  {m.options.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      disabled={sending}
                                      onClick={() => void send({ select: { field: m.optionField!, value: opt.value } })}
                                      className="rounded-xl border border-indigo/30 bg-white px-4 py-2 text-sm font-semibold text-indigo shadow-sm transition hover:border-indigo hover:bg-indigo-tint/60 active:scale-[0.98] disabled:opacity-50"
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Structured Preview Card */}
                            {m.preview && (
                              <OperationPreviewCard
                                preview={m.preview}
                                actionable={isCurrentPreview}
                                busy={busy}
                                onConfirm={() => void handleConfirm()}
                                onCancel={() => void handleCancel()}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Thinking Indicator */}
                  {sending && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 rounded-full bg-indigo animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 rounded-full bg-indigo animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 rounded-full bg-indigo animate-bounce" />
                      </div>
                      <span>Interpreting request...</span>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={onSubmit} className="mt-4 border-t border-border/70 pt-4">
                  <div className="rounded-2xl border border-border/80 bg-surface p-2 shadow-inner focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/20">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={2}
                      maxLength={1000}
                      placeholder="Type a command (e.g. Cancel tomorrow's B2 evening bus)..."
                      aria-label="Admin AI Command"
                      className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70"
                    />
                    <div className="flex items-center justify-between border-t border-border/50 pt-2 px-2">
                      <span className="text-[11px] text-muted">Press <kbd className="rounded border px-1 text-[10px]">Enter ↵</kbd> to send</span>
                      <Button type="submit" loading={sending} disabled={!text.trim()} className="px-5">
                        Send
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Information / Command Guidelines */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink mb-2">Command HUD</h3>
            <p className="text-xs text-muted mb-3">
              The AI Admin translates natural language into structured operations with mandatory backend validation.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted">High Risk Actions:</span>
                <span className="font-semibold text-ink">Explicit Confirm Button</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted">Preview Validity:</span>
                <span className="font-semibold text-ink">30 Minutes (Token Bound)</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted">Audit Logging:</span>
                <span className="font-semibold text-sage">Enforced on All Writes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Push Notifications:</span>
                <span className="font-semibold text-muted">Manual / Disabled</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink mb-2">Supported Domains</h3>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>• <strong className="text-ink">Bus Trips:</strong> Cancel individual timetable trips with automatic schedule exceptions.</li>
              <li>• <strong className="text-ink">Mess Pricing:</strong> Update or schedule future date-bound pricing configurations.</li>
              <li>• <strong className="text-ink">Campus Notices:</strong> Publish, modify, or delete notices.</li>
              <li>• <strong className="text-ink">Holidays:</strong> Declare or adjust institute holidays from the calendar.</li>
              <li>• <strong className="text-ink">Live Queries:</strong> Query buses, alerts, holidays, or mess rates without side effects.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Audit History Log Table */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Execution & Command History</h2>
            <p className="text-xs text-muted">Audit trail of all conversational AI commands initiated in this campus workspace.</p>
          </div>
          <span className="text-xs text-muted font-mono">{history.length} records</span>
        </div>

        {history.length === 0 ? (
          <EmptyState title="No recorded commands yet" />
        ) : (
          <ScrollX>
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-b border-border/80 text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="py-2.5 pr-3">Command Summary</th>
                  <th className="py-2.5 pr-3">Domain / Action</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-3">Admin</th>
                  <th className="py-2.5 pr-3">Audit ID</th>
                  <th className="py-2.5 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {history.map((h) => (
                  <tr key={h.commandId} className="hover:bg-surface/50 transition-colors">
                    <td className="py-2.5 pr-3 font-medium text-ink">{h.summary}</td>
                    <td className="py-2.5 pr-3 text-muted">{h.actionLabel}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill label={STATUS_MAP[h.status]?.label ?? h.status} tone={STATUS_MAP[h.status]?.tone ?? 'neutral'} />
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted font-mono">{h.adminId}</td>
                    <td className="py-2.5 pr-3 text-xs font-mono">
                      {h.auditId ? (
                        <button
                          type="button"
                          onClick={() => copyAuditId(h.auditId!)}
                          className="text-indigo hover:underline"
                          title="Copy Audit ID"
                        >
                          #{h.auditId.slice(-8)}
                        </button>
                      ) : (
                        <span className="text-muted/60">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted">{formatDateTime(h.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        )}
      </Card>
    </div>
  );
}
