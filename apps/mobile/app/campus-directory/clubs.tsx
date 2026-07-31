import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function ClubsScreen() {
  return (
    <ScreenShell hideTitle subtitle="Clubs & societies">
      <ComingSoonPlaceholder
        icon="people-outline"
        title="Clubs & Societies"
        body="Discover student clubs and societies at IIT Jodhpur, along with their advisors and coordinators."
        note="Campus Directory data is currently being prepared. Club details will be available in a future update."
        features={[
          { icon: 'list-outline', label: 'Club Directory' },
          { icon: 'person-outline', label: 'Advisors & Coordinators' },
          { icon: 'mail-outline', label: 'Contact Details' },
        ]}
      />
    </ScreenShell>
  );
}
