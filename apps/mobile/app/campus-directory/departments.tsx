import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function DepartmentsScreen() {
  return (
    <ScreenShell hideTitle subtitle="Academic departments">
      <ComingSoonPlaceholder
        icon="business-outline"
        title="Departments"
        body="Browse academic departments at IIT Jodhpur, along with HODs, faculty, and contact information."
        note="Campus Directory data is currently being prepared. Department details will be available in a future update."
        features={[
          { icon: 'list-outline', label: 'Department List' },
          { icon: 'person-outline', label: 'HOD & Faculty' },
          { icon: 'call-outline', label: 'Contact Details' },
          { icon: 'location-outline', label: 'Building Info' },
        ]}
      />
    </ScreenShell>
  );
}
