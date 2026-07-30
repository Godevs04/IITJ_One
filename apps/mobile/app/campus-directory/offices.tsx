import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function OfficesScreen() {
  return (
    <ScreenShell hideTitle subtitle="Offices & cells">
      <ComingSoonPlaceholder
        icon="file-tray-full-outline"
        title="Offices & Cells"
        body="Find administrative offices, committees, and cells at IIT Jodhpur, along with their contact information."
        note="Campus Directory data is currently being prepared. Office and cell information will be available in a future update."
        features={[
          { icon: 'list-outline', label: 'Office Directory' },
          { icon: 'call-outline', label: 'Contact Details' },
          { icon: 'location-outline', label: 'Location Info' },
        ]}
      />
    </ScreenShell>
  );
}
