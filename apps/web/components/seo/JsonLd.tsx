import { BRAND_NAME, SITE_URL, TAGLINE, PLAY_STORE_URL, APP_STORE_URL } from '@/lib/constants';
import { FAQ_ITEMS } from '@/lib/faq';

/** Renders a single JSON-LD <script> tag. No library — structured data is plain objects. */
function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- static, non-user-controlled JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BRAND_NAME,
        alternateName: 'IITJ1',
        url: SITE_URL,
        description: TAGLINE,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: BRAND_NAME,
        applicationCategory: 'UtilitiesApplication',
        // The app shipped on both platforms; listing Android alone was
        // understating it to crawlers and rich results.
        operatingSystem: ['Android', 'iOS'].join(', '),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        installUrl: [PLAY_STORE_URL, APP_STORE_URL].filter(Boolean),
        description: TAGLINE,
      }}
    />
  );
}

export function FaqJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }}
    />
  );
}
