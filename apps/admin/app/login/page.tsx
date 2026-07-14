'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, login } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState('admin@iitjone.in');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      push('success', 'Welcome back', 'Signed in to IITJ1 Admin');
      router.replace('/');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not sign in';
      push('error', 'Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(198,134,66,0.18), transparent), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(29,63,94,0.12), transparent), #F6F0E4',
        }}
      />
      <div className="relative w-full max-w-md animate-fadeIn">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">
            IITJ one
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-indigo-deep">
            Admin desk
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage menus, notices, and campus data for the mobile app.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border bg-white/90 p-7 shadow-elevated backdrop-blur"
        >
          <div className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
          <Button
            type="submit"
            loading={loading}
            className="mt-6 w-full"
            variant="primary"
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
