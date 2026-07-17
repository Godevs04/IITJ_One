import { Smartphone, Apple } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import { SoftwareApplicationJsonLd } from '@/components/seo/JsonLd';
import { PLAY_STORE_URL, APP_STORE_URL } from '@/lib/constants';

export function DownloadSection() {
  return (
    <section id="download" aria-labelledby="download-heading" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SoftwareApplicationJsonLd />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sandstone">Download</p>
      <h2 id="download-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Launching soon
      </h2>
      <p className="mt-3 text-balance text-base text-muted">
        IITJ One is on its way to Google Play and the App Store. Free for every IIT Jodhpur student, forever — no
        account required.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-sage" aria-hidden />
              <p className="text-sm font-semibold text-ink">Google Play</p>
            </div>
            <StatusPill label={PLAY_STORE_URL ? 'Available' : 'Coming soon'} tone={PLAY_STORE_URL ? 'success' : 'neutral'} />
          </div>
          <div className="mt-4">
            {PLAY_STORE_URL ? (
              <LinkButton href={PLAY_STORE_URL} variant="primary" external className="w-full">
                Get it on Google Play
              </LinkButton>
            ) : (
              <LinkButton href="/#faq" variant="secondary" className="w-full">
                Coming soon — check the FAQ for updates
              </LinkButton>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-muted" aria-hidden />
              <p className="text-sm font-semibold text-ink">App Store</p>
            </div>
            <StatusPill label={APP_STORE_URL ? 'Available' : 'Coming soon'} tone={APP_STORE_URL ? 'success' : 'neutral'} />
          </div>
          <div className="mt-4">
            {APP_STORE_URL ? (
              <LinkButton href={APP_STORE_URL} variant="primary" external className="w-full">
                Get it on the App Store
              </LinkButton>
            ) : (
              <LinkButton href="/#faq" variant="secondary" className="w-full">
                Coming soon — check the FAQ for updates
              </LinkButton>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-white/50 px-5 py-6 text-sm text-muted dark:bg-white/5">
        A QR code linking straight to the store listing will appear here once the app is published.
      </div>
    </section>
  );
}
