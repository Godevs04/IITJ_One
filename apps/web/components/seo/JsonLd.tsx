import { BRAND_NAME, SITE_URL, TAGLINE, PLAY_STORE_URL, APP_STORE_URL, SUPPORT_EMAIL } from '@/lib/constants';
import { FAQ_ITEMS } from '@/lib/faq';
import type { FaqItem } from '@/components/marketing/FaqAccordion';

/**
 * Names people actually type when looking for the app. Google uses
 * `alternateName` when deciding which site name to show and which queries a
 * brand site matches.
 */
const ALTERNATE_NAMES = ['IITJ1', 'IITJ One App', 'IIT Jodhpur App', 'IITJ App', 'IIT Jodhpur Campus App'];

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

/** Renders a single JSON-LD <script> tag. No library — structured data is plain objects. */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- static, non-user-controlled JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Site-wide identity: rendered once from the root layout. */
export function SiteJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': ORG_ID,
            name: BRAND_NAME,
            alternateName: ALTERNATE_NAMES,
            url: SITE_URL,
            logo: `${SITE_URL}/icon.png`,
            email: SUPPORT_EMAIL,
            description: `${BRAND_NAME} is a free, student-built campus companion app for IIT Jodhpur (IITJ) students.`,
            sameAs: [PLAY_STORE_URL, APP_STORE_URL].filter(Boolean),
          },
          {
            '@type': 'WebSite',
            '@id': SITE_ID,
            name: BRAND_NAME,
            alternateName: ALTERNATE_NAMES,
            url: SITE_URL,
            description: TAGLINE,
            inLanguage: 'en-IN',
            publisher: { '@id': ORG_ID },
            about: {
              '@type': 'CollegeOrUniversity',
              name: 'Indian Institute of Technology Jodhpur',
              alternateName: ['IIT Jodhpur', 'IITJ'],
              sameAs: ['https://www.iitj.ac.in', 'https://en.wikipedia.org/wiki/IIT_Jodhpur'],
            },
          },
        ],
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        name: BRAND_NAME,
        alternateName: ALTERNATE_NAMES,
        url: SITE_URL,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Android, iOS',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        installUrl: [PLAY_STORE_URL, APP_STORE_URL].filter(Boolean),
        description: `${TAGLINE} IIT Jodhpur mess menu, bus timings, academic calendar, laundry, Wi-Fi, and Health Center contacts in one free app.`,
        publisher: { '@id': ORG_ID },
      }}
    />
  );
}

export function FaqJsonLd({ items = FAQ_ITEMS }: { items?: FaqItem[] }) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
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

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.path}`,
        })),
      }}
    />
  );
}
