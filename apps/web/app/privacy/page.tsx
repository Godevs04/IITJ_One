import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What IITJ One collects, what it never collects, and why — anonymous analytics, no personal accounts.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Legal" title="Privacy Policy" subtitle="Last reviewed alongside the app's Firebase and analytics integration." />

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="text-lg font-semibold text-ink">No accounts, no personal identity</h2>
          <p className="mt-2 text-muted">
            IITJ One has no student login or personal accounts. Personal features — your saved Mess QR code,
            notes, and timetable — are stored only on your device and are never uploaded anywhere.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">What we collect</h2>
          <p className="mt-2 text-muted">Only anonymous, aggregate usage analytics, used to keep the app fast and reliable:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>App diagnostics — crash logs, handled errors, performance traces</li>
            <li>Aggregate feature usage — which screens and features are opened, how often</li>
            <li>Device metadata — platform, app version, theme, hostel (self-selected, not identifying)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">What we never collect</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Personal names</li>
            <li>Phone numbers</li>
            <li>Mess QR images</li>
            <li>Notes content</li>
            <li>Any data linked to your identity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Push notifications</h2>
          <p className="mt-2 text-muted">
            Notifications are topic-based (e.g. mess, transport, emergency) — there are no per-user notification
            profiles. A device is identified only by a locally generated, anonymous device ID, never by a
            personal account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Third-party services</h2>
          <p className="mt-2 text-muted">
            The app uses Firebase (Google) for analytics, crash reporting, performance monitoring, and push
            notification delivery, under the same anonymous-collection rules above.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Questions</h2>
          <p className="mt-2 text-muted">
            Reach out via the <a href="/support" className="text-indigo hover:underline">Support</a> page for
            anything not covered here.
          </p>
        </section>
      </div>
    </div>
  );
}
