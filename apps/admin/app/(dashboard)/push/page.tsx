'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import {
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Pagination,
  StatusPill,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { PushHistoryDoc } from '@/lib/types';

const TOPICS = [
  'iitj_all',
  'iitj_mess',
  'iitj_transport',
  'iitj_institute',
  'iitj_orientation',
  'iitj_emergency',
  'iitj_calendar',
  'iitj_laundry',
] as const;

/** Values match the SCREEN_ROUTES keys the mobile app's notification-tap handler resolves (apps/mobile/src/services/firebase/messaging.ts). */
const DEEP_LINK_SCREENS = [
  { value: '', label: 'None (no deep link)' },
  { value: 'home', label: 'Home' },
  { value: 'transport', label: 'Transport' },
  { value: 'menu', label: 'Mess' },
  { value: 'mess-qr', label: 'Mess QR' },
  { value: 'notices', label: 'Notices' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'map', label: 'Map' },
  { value: 'search', label: 'Search' },
  { value: 'settings', label: 'Settings' },
] as const;

interface SendResult {
  success?: boolean;
  recipientCount?: number;
  successCount?: number;
  failureCount?: number;
}

export default function PushAdminPage() {
  const { push } = useToast();
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [screen, setScreen] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  const [history, setHistory] = useState<PushHistoryDoc[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyTopic, setHistoryTopic] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const pageSize = 20;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await apiFetch<{ history: PushHistoryDoc[]; total: number }>(
        '/admin/push/history',
        {
          query: {
            topic: historyTopic === 'all' ? undefined : historyTopic,
            search: search.trim() || undefined,
            page: String(page),
            limit: String(pageSize),
          },
        },
      );
      setHistory(data.history ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      push('error', 'Could not load push history', err instanceof Error ? err.message : '');
    } finally {
      setHistoryLoading(false);
    }
  }, [push, historyTopic, search, page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function send() {
    if (!title.trim() || !body.trim()) {
      push('error', 'Missing fields', 'Title and body are required.');
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const data = screen ? { screen } : undefined;
      const result = await apiFetch<SendResult>('/admin/push', {
        method: 'POST',
        body: {
          topic,
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          data,
        },
      });
      setLastResult(result);
      push(
        'success',
        'Push sent',
        `${result.successCount ?? 0} delivered, ${result.failureCount ?? 0} failed of ${result.recipientCount ?? 0} devices`,
      );
      setTitle('');
      setBody('');
      setImageUrl('');
      setScreen('');
      setPage(1);
      await loadHistory();
    } catch (err) {
      push(
        'error',
        'Push failed',
        err instanceof ApiError ? err.message : 'Unknown error',
      );
    } finally {
      setSending(false);
    }
  }

  async function retry(id: string | undefined) {
    if (!id) return;
    setRetryingId(id);
    try {
      const result = await apiFetch<SendResult>(`/admin/push/retry/${id}`, { method: 'POST' });
      push(
        'success',
        'Retry sent',
        `${result.successCount ?? 0} delivered, ${result.failureCount ?? 0} failed of ${result.recipientCount ?? 0} devices`,
      );
      await loadHistory();
    } catch (err) {
      push('error', 'Retry failed', err instanceof ApiError ? err.message : 'Unknown error');
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Push composer"
        subtitle="Send an FCM notification to every device registered for a topic, and review delivery history."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-4">
          <Field label="Topic">
            <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Body">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
            />
          </Field>
          <Field label="Image URL (optional)">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Deep link" hint="Screen the app opens when the notification is tapped">
            <Select value={screen} onChange={(e) => setScreen(e.target.value)}>
              {DEEP_LINK_SCREENS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button loading={sending} onClick={() => void send()}>
            Send Push
          </Button>
          {lastResult ? (
            <p className="text-sm text-muted">
              Last send: {lastResult.successCount ?? 0} delivered, {lastResult.failureCount ?? 0} failed
              of {lastResult.recipientCount ?? 0} registered devices for this topic.
            </p>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Preview</h3>
          <div className="rounded-2xl border border-border bg-sand/40 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 flex-shrink-0 rounded-full bg-indigo/10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {title.trim() || 'Notification title'}
                </p>
                <p className="mt-0.5 line-clamp-3 text-sm text-muted">
                  {body.trim() || 'Notification body text will appear here.'}
                </p>
                {imageUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl.trim()}
                    alt=""
                    className="mt-2 max-h-32 w-full rounded-lg object-cover"
                  />
                ) : null}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted">
            Topic: <span className="font-mono">{topic}</span>
            {screen ? (
              <>
                {' '}
                · Opens: <span className="font-mono">{DEEP_LINK_SCREENS.find((s) => s.value === screen)?.label}</span>
              </>
            ) : null}
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <PageHeader
          title="Push history"
          subtitle="Delivery record for every push sent, latest first."
          actions={
            <Button variant="secondary" onClick={() => void loadHistory()}>
              Refresh
            </Button>
          }
        />

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Filter by topic">
            <Select
              value={historyTopic}
              onChange={(e) => {
                setHistoryTopic(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All topics</option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Search">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Title or body…"
            />
          </Field>
        </div>

        {historyLoading ? (
          <LoadingBlock label="Loading push history…" />
        ) : history.length === 0 ? (
          <EmptyState title="No pushes yet" message="Sent notifications will show up here." />
        ) : (
          <div className="-mx-1 overflow-x-auto scroll-thin px-1">
            <div className="min-w-[900px] overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Sent by</th>
                    <th className="px-4 py-3 font-medium">Delivery</th>
                    <th className="px-4 py-3 font-medium">Firebase message ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => {
                    const status: 'success' | 'partial' | 'failed' =
                      !h.configured || (h.successCount === 0 && h.failureCount > 0)
                        ? 'failed'
                        : h.failureCount > 0
                          ? 'partial'
                          : 'success';
                    return (
                      <tr key={h._id} className="border-b border-border/70 last:border-0 align-top">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                          {new Date(h.sentAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink">{h.topic}</td>
                        <td className="max-w-xs px-4 py-3 text-ink">
                          <p className="font-medium">{h.title}</p>
                          <p className="line-clamp-2 text-xs text-muted">{h.body}</p>
                          {h.retryOf ? <p className="mt-1 text-xs text-muted">Retry of a previous push</p> : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">{h.sentBy}</td>
                        <td className="px-4 py-3 text-xs text-ink">
                          <span className="text-sage">{h.successCount} ok</span>
                          {h.failureCount > 0 ? (
                            <span className="text-non-veg"> · {h.failureCount} failed</span>
                          ) : null}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-muted">
                          {h.firebaseMessageIds[0] ?? '—'}
                          {h.firebaseMessageIds.length > 1 ? ` +${h.firebaseMessageIds.length - 1}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            label={status}
                            tone={status === 'success' ? 'success' : status === 'partial' ? 'warning' : 'danger'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            loading={retryingId === h._id}
                            onClick={() => void retry(h._id)}
                          >
                            Retry
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
