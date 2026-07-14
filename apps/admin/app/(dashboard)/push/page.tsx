'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Card, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';

const TOPICS = [
  'iitj_all',
  'iitj_mess',
  'iitj_transport',
  'iitj_institute',
  'iitj_orientation',
] as const;

export default function PushAdminPage() {
  const { push } = useToast();
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) {
      push('error', 'Missing fields', 'Title and body are required.');
      return;
    }
    setSending(true);
    try {
      await apiFetch('/admin/push', {
        method: 'POST',
        body: { topic, title: title.trim(), body: body.trim() },
      });
      push('success', 'Push queued', `Sent to topic ${topic}`);
      setTitle('');
      setBody('');
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

  return (
    <div>
      <PageHeader
        title="Push composer"
        subtitle="Broadcast an FCM topic message. Returns 503 if Firebase is not configured on the API."
      />
      <Card className="max-w-2xl space-y-4">
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
            className="min-h-[140px]"
          />
        </Field>
        <Button loading={sending} onClick={() => void send()}>
          Send Push
        </Button>
      </Card>
    </div>
  );
}
