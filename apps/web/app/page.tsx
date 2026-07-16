import { Hero } from '@/components/marketing/Hero';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { OfflineSection } from '@/components/marketing/OfflineSection';
import { TrustSection } from '@/components/marketing/TrustSection';
import { AboutSection } from '@/components/marketing/AboutSection';
import { FaqSection } from '@/components/marketing/FaqSection';
import { DownloadSection } from '@/components/marketing/DownloadSection';
import { DownloadCtaBand } from '@/components/marketing/DownloadCtaBand';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <Hero />
      <FeatureGrid />
      <OfflineSection />
      <TrustSection />
      <AboutSection />
      <FaqSection />
      <DownloadSection />
      <DownloadCtaBand />
    </>
  );
}
