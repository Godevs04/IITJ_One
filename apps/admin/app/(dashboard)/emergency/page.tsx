'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, withCampus } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { EmergencyDoc } from '@/lib/types';

export default function EmergencyAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<EmergencyDoc['contacts']>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<EmergencyDoc>(withCampus('/emergency'), {
        auth: false,
      });
      setContacts(data.contacts ?? []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/admin/emergency', {
        method: 'PUT',
        body: { campusId, contacts },
      });
      push('success', 'Emergency contacts published');
      await load();
    } catch (err) {
      push('error', 'Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Emergency Contacts"
        subtitle="Ordered list of helpline numbers for one-tap call."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setContacts((prev) => [
                  ...prev,
                  { label: '', phone: '', order: prev.length + 1 },
                ])
              }
            >
              Add contact
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      {contacts.length === 0 ? (
        <EmptyState title="No contacts" />
      ) : (
        <div className="space-y-3">
          {contacts.map((c, idx) => (
            <Card
              key={idx}
              className="grid gap-3 md:grid-cols-[1.5fr_1.2fr_80px_auto]"
            >
              <Field label="Label">
                <Input
                  value={c.label}
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, label: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={c.phone}
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, phone: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Order">
                <Input
                  type="number"
                  value={c.order}
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((row, i) =>
                        i === idx
                          ? { ...row, order: Number(e.target.value) || 0 }
                          : row,
                      ),
                    )
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setContacts((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
