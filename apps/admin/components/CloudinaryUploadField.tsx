'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { useToast } from '@/components/Toast';

type SignResponse = {
  configured: boolean;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
};

type CloudinaryUploadFieldProps = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
};

export function CloudinaryUploadField({
  label = 'Image',
  value,
  onChange,
  hint = 'Upload via Cloudinary or paste a public image URL.',
}: CloudinaryUploadFieldProps) {
  const { push } = useToast();
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const signed = await apiFetch<SignResponse>('/admin/uploads/sign', {
        method: 'POST',
        body: {},
      });
      if (!signed.configured) {
        push('error', 'Cloudinary unset', 'Paste a URL instead, or configure API env.');
        return;
      }

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('folder', signed.folder);
      form.append('signature', signed.signature);

      const res = await fetch(signed.uploadUrl, { method: 'POST', body: form });
      const body = (await res.json()) as { secure_url?: string; error?: { message?: string } };
      if (!res.ok || !body.secure_url) {
        throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
      }
      onChange(body.secure_url);
      push('success', 'Image uploaded', 'URL filled from Cloudinary.');
    } catch (err) {
      push(
        'error',
        'Upload failed',
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://res.cloudinary.com/…"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer">
            <span className="sr-only">Choose image file</span>
            <input
              type="file"
              accept="image/*"
              className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-tint file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo"
              disabled={uploading}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {uploading ? <span className="text-xs text-muted">Uploading…</span> : null}
          {value ? (
            <Button variant="ghost" type="button" onClick={() => onChange('')}>
              Clear
            </Button>
          ) : null}
        </div>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`${label} preview`}
            className="mt-1 h-28 w-auto rounded-xl border border-border object-cover"
          />
        ) : null}
      </div>
    </Field>
  );
}
