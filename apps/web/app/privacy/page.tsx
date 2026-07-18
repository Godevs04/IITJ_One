import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Card';
import { SUPPORT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What IITJ One collects, what it never collects, and why — anonymous analytics, no personal accounts.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: July 2026" />

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink">
        <p className="text-muted">
          At IITJ One, your privacy comes first. The app is designed to provide campus information without
          requiring you to create an account or share personal information.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-ink">No accounts, no personal identity</h2>
          <p className="mt-2 text-muted">
            IITJ One does not require registration or login. Features such as your Mess QR, personal notes, and
            timetable are stored only on your device. They are never uploaded to our servers and are never
            accessible to us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Information we collect</h2>
          <p className="mt-2 text-muted">
            To improve reliability and understand how the app is used, IITJ One collects a limited amount of
            anonymous, non-personal information, including:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Crash reports and diagnostic information</li>
            <li>Performance metrics</li>
            <li>Anonymous feature usage statistics (such as which screens are opened)</li>
            <li>App version</li>
            <li>Device platform (Android or iOS)</li>
            <li>Theme preference (Light/Dark)</li>
            <li>Hostel selection (used only for personalized campus information)</li>
          </ul>
          <p className="mt-3 text-muted">This information cannot be used to identify you personally.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Information we do not collect</h2>
          <p className="mt-2 text-muted">IITJ One does not collect or store:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Your name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Student ID or ERP credentials</li>
            <li>Mess QR images</li>
            <li>Personal notes</li>
            <li>Timetable content</li>
            <li>Photos, contacts, or messages</li>
            <li>Your precise location</li>
            <li>Any information that directly identifies you</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Notifications</h2>
          <p className="mt-2 text-muted">The app supports topic-based notifications for campus updates such as:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Transport</li>
            <li>Mess</li>
            <li>Notices</li>
            <li>Emergency alerts</li>
            <li>Academic updates</li>
          </ul>
          <p className="mt-3 text-muted">
            Notifications are delivered using anonymous device tokens. IITJ One does not maintain personal
            notification profiles or user accounts.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Third-party services</h2>
          <p className="mt-2 text-muted">IITJ One uses Google Firebase and PostHog to provide:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Analytics</li>
            <li>Crash reporting</li>
            <li>Performance monitoring</li>
            <li>Push notifications</li>
          </ul>
          <p className="mt-3 text-muted">
            These services operate using anonymous identifiers and are configured to avoid collecting personally
            identifiable information whenever possible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Data security</h2>
          <p className="mt-2 text-muted">
            We take reasonable technical measures to protect the information processed by the app. Local data
            remains on your device unless you explicitly choose to share it through your device&apos;s own
            sharing features.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Children&apos;s privacy</h2>
          <p className="mt-2 text-muted">
            IITJ One is intended for members of the IIT Jodhpur community and is not specifically directed
            toward children under the applicable minimum age in their jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Changes to this policy</h2>
          <p className="mt-2 text-muted">
            We may update this Privacy Policy as the app evolves. Any changes will be reflected on this page with
            an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <p className="mt-2 text-muted">
            If you have any questions about privacy or data handling, please contact us through the{' '}
            <a href="/support" className="text-indigo hover:underline">
              Support
            </a>{' '}
            page or at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
