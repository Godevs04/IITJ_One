'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/backend/api/v1';

export function SuggestionForm() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch(`${API_URL}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-sage/10 px-5 py-6 text-sm text-ink">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-sage" aria-hidden />
        <p>Thanks — your feedback was sent anonymously to the team.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="suggestion-message" className="block text-sm font-medium text-ink">
        Your feedback
      </label>
      <textarea
        id="suggestion-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        required
        placeholder="A bug, an idea, or anything else — sent anonymously."
        aria-describedby="suggestion-hint"
        className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/15 dark:bg-surface/60"
      />
      <p id="suggestion-hint" className="text-xs text-muted">
        No account or email required — this goes straight to the admin panel&apos;s Suggestions inbox.
      </p>
      {status === 'error' ? (
        <p role="alert" className="text-sm text-non-veg">
          Couldn&apos;t send that — check your connection and try again.
        </p>
      ) : null}
      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send feedback'}
      </Button>
    </form>
  );
}
