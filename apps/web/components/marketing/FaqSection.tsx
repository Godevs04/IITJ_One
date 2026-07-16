import { FaqAccordion } from './FaqAccordion';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { FAQ_ITEMS } from '@/lib/faq';

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <FaqJsonLd />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">FAQ</p>
      <h2 id="faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-8">
        <FaqAccordion items={FAQ_ITEMS} />
      </div>
    </section>
  );
}
