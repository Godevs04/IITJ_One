import { BRAND_NAME, SITE_URL, TAGLINE, PLAY_STORE_URL, APP_STORE_URL, SUPPORT_EMAIL } from '@/lib/constants';
import { FAQ_ITEMS } from '@/lib/faq';
import type { FaqItem } from '@/components/marketing/FaqAccordion';

/** Brand aliases, distinct from the institute that the guides describe. */
const ALTERNATE_NAMES = ['IITJ1', 'IITJ One App'];

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;
const INSTITUTE_ID = 'https://www.iitj.ac.in/#institute';
const pageUrl = (path: string) => path === '/' ? SITE_URL : `${SITE_URL}${path}`;

/** Renders a single JSON-LD <script> tag. No library — structured data is plain objects. */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- static, non-user-controlled JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
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
            description: 'IIT Jodhpur campus guides and the IITJ One student companion app.',
            inLanguage: 'en-IN',
            publisher: { '@id': ORG_ID },
            about: { '@id': INSTITUTE_ID },
          },
          {
            '@type': 'CollegeOrUniversity',
            '@id': INSTITUTE_ID,
            name: 'Indian Institute of Technology Jodhpur',
            alternateName: ['IIT Jodhpur', 'IITJ'],
            url: 'https://www.iitj.ac.in/',
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
        '@id': APP_ID,
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

export function FaqJsonLd({ items = FAQ_ITEMS, path = '/' }: { items?: FaqItem[]; path?: string }) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${pageUrl(path)}#faq`,
        isPartOf: { '@id': `${pageUrl(path)}#webpage` },
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
  const path = items.at(-1)?.path || '/';
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl(path)}#breadcrumb`,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: pageUrl(item.path),
        })),
      }}
    />
  );
}

/** Page identity connects each guide to the site and its visible breadcrumbs. */
export function WebPageJsonLd({
  path,
  title,
  description,
  dateModified,
}: {
  path: string;
  title: string;
  description: string;
  dateModified?: string;
}) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${pageUrl(path)}#webpage`,
        url: pageUrl(path),
        name: title,
        description,
        inLanguage: 'en-IN',
        isPartOf: { '@id': SITE_ID },
        publisher: { '@id': ORG_ID },
        about: { '@id': INSTITUTE_ID },
        dateModified,
        ...(path !== '/' ? { breadcrumb: { '@id': `${pageUrl(path)}#breadcrumb` } } : {}),
      }}
    />
  );
}
