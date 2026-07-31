'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Button } from './Button';
import { Field, Input, Select, Textarea } from './Field';
import { useToast } from './Toast';
import type { CampaignDoc } from '@/lib/types';

interface CampaignNotifyModalProps {
  campaign: CampaignDoc;
  onClose: () => void;
}

// Same topic list as the generic Push composer (apps/admin/app/(dashboard)/push/page.tsx) —
// these are the only topics devices actually subscribe to (see apps/mobile/src/services/firebase/messaging.ts).
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

interface SendResult {
  successCount?: number;
  failureCount?: number;
  recipientCount?: number;
}

/** Sends a push for one specific campaign — reuses the existing POST /admin/push endpoint directly (no new backend route), with `data: { screen: 'discover', id }` so the mobile app's notification-tap handler opens this campaign's Details page. */
export function CampaignNotifyModal({ campaign, onClose }: CampaignNotifyModalProps) {
  const { push } = useToast();
  const [topic, setTopic] = useState<string>('iitj_all');
  const [title, setTitle] = useState(campaign.title);
  const [body, setBody] = useState(campaign.subtitle || campaign.description?.slice(0, 120) || '');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!campaign._id) return;
    if (!title.trim() || !body.trim()) {
      push('error', 'Missing fields', 'Title and body are required.');
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch<SendResult>('/admin/push', {
        method: 'POST',
        body: {
          topic,
          title: title.trim(),
          body: body.trim(),
          imageUrl: campaign.visuals?.images?.[0] || campaign.visuals?.imageUrl || undefined,
          data: { screen: 'discover', id: campaign._id },
        },
      });
      push(
        'success',
        'Push sent',
        `${result.successCount ?? 0} delivered, ${result.failureCount ?? 0} failed of ${result.recipientCount ?? 0} devices`,
      );
      onClose();
    } catch (err) {
      push('error', 'Push failed', err instanceof ApiError ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[1.25rem] border border-border/80 bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Send notification</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
            Close
          </button>
        </div>

        <div className="space-y-3 p-4">
          <Field label="Topic">
            <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Body">
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <p className="text-xs text-muted">Tapping this notification opens this campaign&apos;s Details page.</p>
          <Button className="w-full" loading={sending} onClick={() => void send()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
