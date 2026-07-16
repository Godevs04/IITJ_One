import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, Card } from '@/components/ui/Card';
import { SuggestionForm } from './SuggestionForm';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Send anonymous feedback, report a bug, or find an answer in the FAQ.',
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Support" title="We're listening" subtitle="Found a bug, or have an idea? Tell us — anonymously." />

      <Card className="mt-8">
        <SuggestionForm />
      </Card>

      <p className="mt-6 text-sm text-muted">
        Looking for a quick answer instead? Check the{' '}
        <Link href="/#faq" className="text-indigo hover:underline">
          FAQ
        </Link>
        .
      </p>
    </div>
  );
}
