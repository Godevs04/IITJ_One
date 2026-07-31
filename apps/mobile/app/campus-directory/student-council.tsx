import { ScreenShell } from '@/components/ScreenShell';
import { ComingSoonPlaceholder } from '@/components/ComingSoonPlaceholder';

export default function StudentCouncilScreen() {
  return (
    <ScreenShell hideTitle subtitle="Student council">
      <ComingSoonPlaceholder
        icon="megaphone-outline"
        title="Student Council"
        body="Meet the Student Council representatives and their faculty advisor at IIT Jodhpur."
        note="Campus Directory data is currently being prepared. Student Council information will be available in a future update."
        features={[
          { icon: 'people-outline', label: 'Council Members' },
          { icon: 'ribbon-outline', label: 'Faculty Advisor' },
          { icon: 'mail-outline', label: 'Contact Details' },
        ]}
      />
    </ScreenShell>
  );
}
