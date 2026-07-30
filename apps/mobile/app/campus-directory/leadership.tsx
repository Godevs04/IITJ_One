import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function LeadershipScreen() {
  return (
    <ScreenShell hideTitle subtitle="Institute leadership">
      <ComingSoonPlaceholder
        icon="ribbon-outline"
        title="Leadership"
        body="Meet the Director, Deputy Director, and senior institute leadership at IIT Jodhpur."
        note="Campus Directory data is currently being prepared. Leadership profiles will be available in a future update."
        features={[
          { icon: 'person-outline', label: 'Leadership Profiles' },
          { icon: 'mail-outline', label: 'Contact Details' },
          { icon: 'business-outline', label: 'Office Information' },
        ]}
      />
    </ScreenShell>
  );
}
