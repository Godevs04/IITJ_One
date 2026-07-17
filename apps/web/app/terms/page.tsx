import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms for using IITJ One — a free, student-built campus companion app for IIT Jodhpur.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Legal" title="Terms of Use" subtitle="Last updated: July 2026" />

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink">
        <p className="text-muted">
          Welcome to IITJ One. By downloading or using the app, you agree to these Terms of Use.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-ink">Student-developed project</h2>
          <p className="mt-2 text-muted">
            IITJ One is an independent application created by students for the IIT Jodhpur community. It is not
            affiliated with, operated by, or officially endorsed by the Indian Institute of Technology Jodhpur.
            Any references to IIT Jodhpur are solely for the purpose of providing campus-related information to
            students.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Using the app</h2>
          <p className="mt-2 text-muted">
            IITJ One is provided free of charge for personal, non-commercial use. You may use the app to access
            campus information, including:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Mess menus</li>
            <li>Transport schedules</li>
            <li>Academic calendar</li>
            <li>Laundry schedules</li>
            <li>Emergency contacts</li>
            <li>Campus services</li>
            <li>Official notices</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Information accuracy</h2>
          <p className="mt-2 text-muted">
            We strive to keep all campus information accurate and up to date. However, information such as
            transport timings, mess menus, notices, and schedules may change without notice. While we make every
            reasonable effort to maintain accuracy, IITJ One should not be considered the official source for
            time-critical, administrative, or emergency communications. For official announcements, always refer
            to IIT Jodhpur&apos;s official communication channels.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Acceptable use</h2>
          <p className="mt-2 text-muted">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Attempt to disrupt or interfere with the operation of the app.</li>
            <li>Reverse engineer or misuse the application&apos;s services.</li>
            <li>Perform excessive automated requests or scraping that could affect service availability.</li>
            <li>Submit abusive, misleading, or malicious content through feedback or support channels.</li>
            <li>Use the app for unlawful activities.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Intellectual property</h2>
          <p className="mt-2 text-muted">
            Unless otherwise stated, the IITJ One application, its design, branding, content, and original
            software are the property of the IITJ One project. Logos, trademarks, and names belonging to IIT
            Jodhpur or other organizations remain the property of their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Third-party services</h2>
          <p className="mt-2 text-muted">
            IITJ One uses trusted third-party services, including Google Firebase and PostHog, to provide
            analytics, crash reporting, performance monitoring, and push notifications. Use of those services is
            governed by their respective terms and privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Service availability</h2>
          <p className="mt-2 text-muted">
            While we aim to keep IITJ One available at all times, we cannot guarantee uninterrupted access.
            Features may be modified, suspended, or discontinued as the project evolves.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Limitation of liability</h2>
          <p className="mt-2 text-muted">
            IITJ One is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind.
            To the fullest extent permitted by applicable law, the IITJ One team is not responsible for any
            direct or indirect loss resulting from the use of the app or reliance on the information provided.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Changes to these terms</h2>
          <p className="mt-2 text-muted">
            These Terms of Use may be updated from time to time as the project evolves. Any changes will be
            published on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <p className="mt-2 text-muted">
            If you have any questions about these Terms of Use, please contact us through the{' '}
            <a href="/support" className="text-indigo hover:underline">
              Support
            </a>{' '}
            page or the official IITJ One support email.
          </p>
        </section>
      </div>
    </div>
  );
}
