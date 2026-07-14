'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, withCampus } from '@/lib/api';
import { Button } from '@/components/Button';
import { Textarea } from '@/components/Field';
import { Card, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';

interface JsonModuleEditorProps {
  title: string;
  subtitle: string;
  publicPath: string;
  adminPath: string;
  emptyDoc: unknown;
}

export function JsonModuleEditor({
  title,
  subtitle,
  publicPath,
  adminPath,
  emptyDoc,
}: JsonModuleEditorProps) {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<unknown>(withCampus(publicPath), {
        auth: false,
      });
      setText(JSON.stringify(data ?? emptyDoc, null, 2));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setText(JSON.stringify(emptyDoc, null, 2));
      } else {
        push(
          'error',
          `Could not load ${title}`,
          err instanceof Error ? err.message : 'Unknown error',
        );
        setText(JSON.stringify(emptyDoc, null, 2));
      }
    } finally {
      setLoading(false);
    }
  }, [publicPath, emptyDoc, title, push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      push('error', 'Invalid JSON', 'Fix syntax before publishing.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(adminPath, { method: 'PUT', body: parsed });
      push('success', `${title} published`, 'Module version bumped for sync.');
      await load();
    } catch (err) {
      push(
        'error',
        'Save failed',
        err instanceof ApiError ? err.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock label={`Loading ${title}…`} />;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Reload
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      <Card>
        <p className="mb-3 text-sm text-muted">
          Edit the full document as JSON. Structure must match the API schema.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[480px] font-mono text-xs leading-relaxed"
          spellCheck={false}
        />
      </Card>
    </div>
  );
}
