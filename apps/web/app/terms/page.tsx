import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Card';
import { DISCLAIMER } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms for using IITJ One — a free, student-built campus companion app for IIT Jodhpur.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Legal" title="Terms of Use" />

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="text-lg font-semibold text-ink">Not an official IIT Jodhpur service</h2>
          <p className="mt-2 text-muted">{DISCLAIMER}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Free, as-is use</h2>
          <p className="mt-2 text-muted">
            IITJ One is provided free of charge, with no warranty of any kind. Campus data (mess menu, transport
            timings, notices, and similar) is sourced and kept up to date on a best-effort basis, but the app is
            not a substitute for official institute communication for anything time-critical or safety-related.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Fair use</h2>
          <p className="mt-2 text-muted">
            Don&apos;t attempt to disrupt the service, scrape or excessively automate requests to it, or use
            anonymous feedback channels to submit abusive content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Changes</h2>
          <p className="mt-2 text-muted">
            Features, screens, and these terms may change as the app evolves — this page reflects the current
            state of the project.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <p className="mt-2 text-muted">
            Questions go through the <a href="/support" className="text-indigo hover:underline">Support</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
