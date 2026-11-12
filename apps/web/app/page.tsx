import { Hero } from '@/components/marketing/Hero';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { OfflineSection } from '@/components/marketing/OfflineSection';
import { TrustSection } from '@/components/marketing/TrustSection';
import { AboutSection } from '@/components/marketing/AboutSection';
import { FaqSection } from '@/components/marketing/FaqSection';
import { DownloadSection } from '@/components/marketing/DownloadSection';
import { DownloadCtaBand } from '@/components/marketing/DownloadCtaBand';
import { WebPageJsonLd } from '@/components/seo/JsonLd';

export default function HomePage() {
  return (
    <>
      <WebPageJsonLd path="/" title="IITJ One — IIT Jodhpur Campus Guide" description="IIT Jodhpur mess menu, bus timings, departments, and student services with the IITJ One campus app." dateModified="2026-11-05" />
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
