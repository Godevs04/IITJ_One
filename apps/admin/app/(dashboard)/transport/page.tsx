'use client';

import { campusId } from '@/lib/api';
import { JsonModuleEditor } from '@/components/JsonModuleEditor';

export default function TransportAdminPage() {
  return (
    <JsonModuleEditor
      title="Transport"
      subtitle="Routes, trips, live tracking URL, and schedule overrides."
      publicPath="/transport"
      adminPath="/admin/transport"
      emptyDoc={{
        campusId,
        routes: [],
        shuttle: [],
        liveTrackingUrl: null,
        scheduleOverrides: [],
      }}
    />
  );
}
