import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function AdministrationScreen() {
  return (
    <ScreenShell hideTitle subtitle="Administrative staff">
      <ComingSoonPlaceholder
        icon="briefcase-outline"
        title="Administration"
        body="Find registrar staff, deans, and administrative office contacts across IIT Jodhpur."
        note="Campus Directory data is currently being prepared. Administration information will be available in a future update."
        features={[
          { icon: 'people-outline', label: 'Staff Directory' },
          { icon: 'ribbon-outline', label: 'Deans & Registrar' },
          { icon: 'call-outline', label: 'Contact Details' },
        ]}
      />
    </ScreenShell>
  );
}
