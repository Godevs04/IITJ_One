import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPinned } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { DownloadCtaBand } from '@/components/marketing/DownloadCtaBand';
import { BreadcrumbJsonLd, FaqJsonLd, SoftwareApplicationJsonLd } from '@/components/seo/JsonLd';
import { FEATURE_PAGES, getFeaturePage } from '@/lib/featurePages';
import { FEATURE_ICONS } from '@/lib/featureIcons';
import { DISCLAIMER, PLAY_STORE_URL, APP_STORE_URL } from '@/lib/constants';

// Only the slugs in FEATURE_PAGES exist; anything else is a real 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURE_PAGES.map((page) => ({ slug: page.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = getFeaturePage(slug);
  if (!page) return {};

  const path = `/${page.slug}`;
  return {
    // `absolute` skips the "| IITJ One" template — these titles already end with the brand/keyword.
    title: { absolute: page.title },
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: 'IITJ One',
      url: path,
      title: page.title,
      description: page.description,
      // Declaring openGraph here replaces the inherited file-based image, so re-attach it.
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: page.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: ['/twitter-image'],
    },
  };
}

export default async function FeatureLandingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = getFeaturePage(slug);
  if (!page) notFound();

  const Icon = page.feature ? FEATURE_ICONS[page.feature] : MapPinned;
  const related = FEATURE_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'IITJ One', path: '' },
          { name: page.label, path: `/${page.slug}` },
        ]}
      />
      <FaqJsonLd items={page.faqs} />
      <SoftwareApplicationJsonLd />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-indigo">
                IITJ One
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="text-ink">
              {page.label}
            </li>
          </ol>
        </nav>

        <div className="flex items-start gap-4">
          <span className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-tint text-indigo sm:inline-flex">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <PageHeader eyebrow="IIT Jodhpur campus guide" title={page.h1} subtitle={page.intro} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {PLAY_STORE_URL ? (
            <LinkButton href={PLAY_STORE_URL} variant="marketing" external>
              Get it on Google Play
            </LinkButton>
          ) : null}
          {APP_STORE_URL ? (
            <LinkButton href={APP_STORE_URL} variant="secondary" external>
              Download on the App Store
            </LinkButton>
          ) : null}
        </div>

        <section aria-labelledby="highlights-heading" className="mt-12">
          <h2 id="highlights-heading" className="text-2xl font-semibold tracking-tight text-ink">
            What you get in IITJ One
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {page.highlights.map((item) => (
              <Card key={item.title}>
                <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="page-faq-heading" className="mt-12">
          <h2 id="page-faq-heading" className="text-2xl font-semibold tracking-tight text-ink">
            {page.label} — common questions
          </h2>
          <div className="mt-6">
            <FaqAccordion items={page.faqs} />
          </div>
        </section>

        <section aria-labelledby="related-heading" className="mt-12">
          <h2 id="related-heading" className="text-lg font-semibold text-ink">
            More for IIT Jodhpur students
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="inline-flex rounded-full border border-border px-3.5 py-1.5 text-sm text-ink/80 transition hover:border-indigo/30 hover:text-indigo"
                >
                  IIT Jodhpur {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
      </article>

      <DownloadCtaBand />
    </>
  );
}
