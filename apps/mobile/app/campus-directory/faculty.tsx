import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function FacultyScreen() {
  return (
    <ScreenShell hideTitle subtitle="Faculty directory">
      <ComingSoonPlaceholder
        icon="school-outline"
        title="Faculty"
        body="Search and browse faculty members across all departments, including designation, research areas, and contact details."
        note="Campus Directory data is currently being prepared. Faculty information will be available in a future update."
        features={[
          { icon: 'search-outline', label: 'Search & Filter' },
          { icon: 'flask-outline', label: 'Research Areas' },
          { icon: 'mail-outline', label: 'Contact Details' },
          { icon: 'business-outline', label: 'Department Info' },
        ]}
      />
    </ScreenShell>
  );
}
