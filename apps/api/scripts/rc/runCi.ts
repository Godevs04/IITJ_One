/**
 * Phase 7.2 — CI Mode.
 *
 * A single, unattended entry point suitable for a 24/7 CI/CD pipeline:
 * build -> typecheck -> unit/integration tests -> RC E2E validation ->
 * machine-readable release-report.json -> non-zero exit on any failure.
 *
 * Manages its own dev-server lifecycle (spawns it, waits for /health, tears
 * it down in a `finally` regardless of outcome) instead of assuming a human
 * already started one in another terminal — the manual docs/RUN_TESTS.md
 * workflow is unaffected and still works the same way for local dev.
 *
 * Usage: npm run test:rc   (from apps/api)
 */
import { spawn, execFile, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);
const API_DIR = process.cwd();
const REPO_ROOT = path.join(API_DIR, '..', '..');
const HEALTH_URL = 'http://localhost:6002/api/v1/health';
const SERVER_START_TIMEOUT_MS = 20_000;

interface PhaseResult {
  name: string;
  ok: boolean;
  durationMs: number;
  detail: string;
}

const phases: PhaseResult[] = [];

async function runPhase(name: string, fn: () => Promise<string>): Promise<boolean> {
  const started = Date.now();
  console.log(`\n=== ${name} ===`);
  try {
    const detail = await fn();
    const durationMs = Date.now() - started;
    phases.push({ name, ok: true, durationMs, detail });
    console.log(`✓ ${name} (${durationMs}ms)`);
    return true;
  } catch (err) {
    const durationMs = Date.now() - started;
    const detail = err instanceof Error ? err.message : String(err);
    phases.push({ name, ok: false, durationMs, detail });
    console.log(`✗ ${name} (${durationMs}ms): ${detail}`);
    return false;
  }
}

async function runNpmScript(script: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync('npm', ['run', script], {
    cwd: API_DIR,
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout + stderr;
}

async function runTestSuite(): Promise<{ summary: string; pass: number; fail: number; total: number }> {
  let output = '';
  try {
    const { stdout, stderr } = await execFileAsync('npm', ['test'], {
      cwd: API_DIR,
      shell: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    output = stdout + stderr;
  } catch (err) {
    // npm test exits non-zero on any failing subtest — still parse its
    // captured output for the real pass/fail counts rather than treating
    // this as an unparseable crash.
    const failed = err as { stdout?: string; stderr?: string };
    output = (failed.stdout ?? '') + (failed.stderr ?? '');
    if (!output) throw err;
  }
  const pass = Number(output.match(/^# pass (\d+)/m)?.[1] ?? '0');
  const fail = Number(output.match(/^# fail (\d+)/m)?.[1] ?? '0');
  const total = Number(output.match(/^# tests (\d+)/m)?.[1] ?? '0');
  // Always captured, pass or fail — a flake that only shows up once in N
  // runs is undiagnosable without the raw output from the run it happened
  // in, and CI logs of a passing run get discarded/overwritten too fast to
  // rely on after the fact.
  await writeFile(path.join(API_DIR, 'test-output.log'), output);
  if (fail > 0) {
    const failingNames = [...output.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((m) => m[1]);
    throw new Error(`${fail}/${total} tests failed (${pass} passed): ${failingNames.join('; ')}`);
  }
  return { summary: `${pass}/${total} passed`, pass, fail, total };
}

function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(HEALTH_URL);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) {
        reject(new Error(`server did not become healthy within ${timeoutMs}ms`));
        return;
      }
      setTimeout(attempt, 500);
    };
    void attempt();
  });
}

function resolveTsxCli(): string {
  const tsxPkgPath = require.resolve('tsx/package.json', { paths: [API_DIR] });
  const tsxPkg = require(tsxPkgPath) as { bin?: Record<string, string> | string };
  const binRelative = typeof tsxPkg.bin === 'string' ? tsxPkg.bin : tsxPkg.bin?.tsx;
  if (!binRelative) throw new Error('Could not resolve tsx CLI bin path from tsx/package.json');
  return path.join(path.dirname(tsxPkgPath), binRelative);
}

function startServer(): ChildProcess {
  const tsxCli = resolveTsxCli();
  // Deliberately NOT `tsx watch` — a mid-run file-edit-triggered restart
  // would silently reset in-memory state (contributor pool, GPS throttle
  // map, Prometheus counters) partway through a CI run.
  return spawn(process.execPath, [tsxCli, 'src/index.ts'], {
    cwd: API_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function getGitCommitHash(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function getReleaseMetrics(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch('http://localhost:6002/metrics');
    const text = await res.text();
    const grab = (name: string): number | null => {
      const match = text.match(new RegExp(`^${name} ([\\d.e+-]+)`, 'm'));
      return match ? Number(match[1]) : null;
    };
    return {
      gpsUpdatesAccepted: grab('gps_updates_total\\{result="accepted",reason="n/a"\\}'),
      fusionExecutionsTotal: grab('fusion_executions_total'),
      busstatePersistDurationSum: grab('busstate_persist_duration_seconds_sum'),
      busstatePersistDurationCount: grab('busstate_persist_duration_seconds_count'),
      eventLoopLagP50Seconds: grab('nodejs_eventloop_lag_p50_seconds'),
      eventLoopLagP99Seconds: grab('nodejs_eventloop_lag_p99_seconds'),
      processResidentMemoryBytes: grab('process_resident_memory_bytes'),
      redisUp: grab('redis_up'),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const runStarted = Date.now();
  console.log('=== IITJ One RC CI Run ===');

  await runPhase('Typecheck', async () => {
    await runNpmScript('typecheck');
    return 'clean';
  });

  await runPhase('Build', async () => {
    await runNpmScript('build');
    return 'dist/ compiled';
  });

  let server: ChildProcess | null = null;
  try {
    await runPhase('Start dev server', async () => {
      server = startServer();
      await waitForHealth(SERVER_START_TIMEOUT_MS);
      return 'healthy';
    });

    await runPhase('Unit / integration test suite (npm test)', async () => {
      const result = await runTestSuite();
      return result.summary;
    });

    await runPhase('RC E2E validation (e2eFlow.ts)', async () => {
      const { stdout } = await execFileAsync('npx', ['tsx', 'scripts/rc/e2eFlow.ts'], {
        cwd: API_DIR,
        shell: true,
        maxBuffer: 20 * 1024 * 1024,
      }).catch((err) => ({ stdout: (err as { stdout?: string }).stdout ?? '', stderr: '' }));
      const jsonLine = stdout.split('\n').find((l) => l.startsWith('JSON: '));
      if (!jsonLine) throw new Error('could not parse e2eFlow.ts JSON summary from output');
      const parsed = JSON.parse(jsonLine.slice('JSON: '.length)) as { passed: number; failed: number; total: number };
      if (parsed.failed > 0) throw new Error(`${parsed.failed}/${parsed.total} E2E steps failed`);
      return `${parsed.passed}/${parsed.total} steps passed`;
    });

    const metrics = await getReleaseMetrics();
    const commitHash = await getGitCommitHash();
    const durationMs = Date.now() - runStarted;
    const overallOk = phases.every((p) => p.ok);

    const report = {
      timestamp: new Date().toISOString(),
      commitHash,
      rcStatus: overallOk ? 'PASS' : 'FAIL',
      durationMs,
      phases,
      performanceMetrics: metrics,
    };
    await writeFile(path.join(REPO_ROOT, 'release-report.json'), JSON.stringify(report, null, 2));

    console.log('\n=== Final Summary ===');
    for (const p of phases) console.log(`  ${p.ok ? '✓' : '✗'} ${p.name} (${p.durationMs}ms)`);
    console.log(`\nRC Status: ${report.rcStatus}`);
    console.log(`Total duration: ${durationMs}ms`);
    console.log(`Report written to release-report.json`);

    process.exitCode = overallOk ? 0 : 1;
  } finally {
    if (server) {
      const proc = server as ChildProcess;
      proc.kill();
    }
  }
}

main().catch((err) => {
  console.error('RC CI run crashed:', err);
  process.exitCode = 1;
});
