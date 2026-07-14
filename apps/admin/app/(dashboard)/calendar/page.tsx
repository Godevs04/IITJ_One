'use client';

import { campusId } from '@/lib/api';
import { JsonModuleEditor } from '@/components/JsonModuleEditor';

export default function CalendarAdminPage() {
  return (
    <JsonModuleEditor
      title="Calendar"
      subtitle="Semester events and academic calendar entries."
      publicPath="/calendar"
      adminPath="/admin/calendar"
      emptyDoc={{ campusId, semester: '', events: [] }}
    />
  );
}
