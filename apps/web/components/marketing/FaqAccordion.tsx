'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const idPrefix = useId();

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-surface/90">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${idPrefix}-faq-panel-${index}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40"
              >
                {item.question}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
            </h3>
            {/* Always in the DOM (just hidden) so crawlers can read every answer. */}
            <div id={panelId} hidden={!isOpen} className="px-5 pb-4 text-sm text-muted">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
