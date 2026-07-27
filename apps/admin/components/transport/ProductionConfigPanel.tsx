import { Card } from '@/components/ui';
import { getTransportConfig } from '@/lib/transportConfig';

/**
 * Read-only — NEXT_PUBLIC_* variables are baked into the JS bundle at build
 * time, so this panel cannot change them at runtime; it displays what this
 * deployment was actually built with, and documents the override variables
 * so an operator can set them per environment (.env.development/.env.production
 * or the hosting platform's environment variable UI) before the next build.
 */
export function ProductionConfigPanel() {
  const config = getTransportConfig();

  const rows: { label: string; value: string; envVar: string }[] = [
    { label: 'Environment', value: config.environment, envVar: 'NEXT_PUBLIC_APP_ENV' },
    { label: 'Trips poll interval', value: `${config.tripsPollMs}ms`, envVar: 'NEXT_PUBLIC_TRIPS_POLL_MS' },
    { label: 'Health poll interval', value: `${config.healthPollMs}ms`, envVar: 'NEXT_PUBLIC_HEALTH_POLL_MS' },
    { label: 'Socket URL override', value: config.socketUrlOverride ?? '(derived from NEXT_PUBLIC_API_URL)', envVar: 'NEXT_PUBLIC_SOCKET_URL' },
    { label: 'Map style', value: config.mapStyle, envVar: 'NEXT_PUBLIC_MAP_STYLE' },
    { label: 'Debug logging', value: config.debugLogging ? 'on' : 'off', envVar: 'NEXT_PUBLIC_DEBUG_LOGGING' },
    { label: 'GPS publish interval (Driver Mode)', value: `${config.gpsPublishIntervalMs}ms`, envVar: 'NEXT_PUBLIC_GPS_PUBLISH_INTERVAL_MS' },
  ];

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Production Configuration</h2>
        <p className="text-sm text-muted">
          Resolved values for this build (lib/transportConfig.ts). These are compiled into the bundle at build time —
          change the corresponding environment variable and rebuild/redeploy to take effect, not edit here.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Setting</th>
              <th className="py-2 pr-3">Current value</th>
              <th className="py-2 pr-3">Env var</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.envVar} className="border-b border-border/60">
                <td className="py-2 pr-3 text-ink">{row.label}</td>
                <td className="py-2 pr-3 font-mono text-xs text-muted">{row.value}</td>
                <td className="py-2 pr-3 font-mono text-xs text-indigo">{row.envVar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
