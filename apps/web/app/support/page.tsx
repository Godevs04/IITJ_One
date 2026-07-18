import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { FaqAccordion, type FaqItem } from '@/components/marketing/FaqAccordion';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { SuggestionForm } from './SuggestionForm';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with IITJ One — contact us, browse the FAQ, report a bug, or suggest a feature.',
};

interface FaqCategory {
  category: string;
  items: FaqItem[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    category: 'Account issues',
    items: [
      {
        question: 'Do I need to create an account?',
        answer:
          'No. IITJ One has no login or student accounts of any kind. Every campus data screen is available immediately, and personal features (Mess QR, notes, timetable) stay entirely on your device — there is nothing to sign in to and nothing to recover.',
      },
    ],
  },
  {
    category: 'App problems',
    items: [
      {
        question: 'The app is showing old or missing data — what do I do?',
        answer:
          'Pull to refresh on the affected screen to force a fresh sync. If a screen still looks wrong or the app crashes, use "Report a Bug" below and include which screen it happened on — that\'s the fastest way for us to fix it.',
      },
    ],
  },
  {
    category: 'Bus tracking',
    items: [
      {
        question: 'How do I check bus and shuttle timings?',
        answer:
          'Open the Transport tab for the full route schedule, including a live countdown to the next departure for each stop.',
      },
    ],
  },
  {
    category: 'Transport schedules',
    items: [
      {
        question: 'What happens when a bus schedule changes temporarily (breakdown, festival, exam)?',
        answer:
          'The Transport tab shows a banner with the replacement schedule for as long as the change is active, then automatically reverts to the normal timetable — no manual switching required.',
      },
    ],
  },
  {
    category: 'Notices',
    items: [
      {
        question: 'Where do official campus notices show up?',
        answer:
          'The Notices tab lists official institute announcements as they\'re published, and works offline once you\'ve opened the app at least once.',
      },
    ],
  },
  {
    category: 'Feature requests',
    items: [
      {
        question: 'How do I suggest a new feature?',
        answer:
          'Use "Suggest a Feature" below, or send anonymous feedback through the form at the bottom of this page — both go straight to the team.',
      },
    ],
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Support" title="We're here to help." subtitle="Questions, bugs, or ideas — here's how to reach us." />

      <Card className="mt-8">
        <div className="space-y-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 text-sm text-ink hover:text-indigo"
          >
            <Mail className="h-4 w-4 shrink-0 text-indigo" aria-hidden />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </Card>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <LinkButton
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Bug Report')}`}
          variant="primary"
          className="flex-1"
        >
          Report a Bug
        </LinkButton>
        <LinkButton
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Feature Request')}`}
          variant="secondary"
          className="flex-1"
        >
          Suggest a Feature
        </LinkButton>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Frequently asked questions</h2>
        <div className="mt-4 space-y-6">
          {FAQ_CATEGORIES.map((group) => (
            <div key={group.category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                {group.category}
              </p>
              <FaqAccordion items={group.items} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-ink">Prefer to stay anonymous?</h2>
        <p className="mt-2 text-sm text-muted">
          Send feedback with no email or name attached — it goes straight to the admin panel&apos;s Suggestions inbox.
        </p>
        <Card className="mt-4">
          <SuggestionForm />
        </Card>
      </div>

      <p className="mt-10 text-sm text-muted">
        Looking for something else? Check the{' '}
        <Link href="/#faq" className="text-indigo hover:underline">
          general FAQ
        </Link>{' '}
        on the homepage.
      </p>
    </div>
  );
}
