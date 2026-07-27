/**
 * Phase 7 — Release Candidate load-test sweep.
 *
 * Runs the existing scripts/loadTestLiveTracking.ts at 1/5/20/50 contributors
 * against the already-running dev server (see docs/RUN_TESTS.md), sampling
 * the SERVER process's own CPU time and memory (via PowerShell Get-Process
 * against a caller-supplied PID) before/after each run — the thing the
 * original script explicitly could not measure itself ("Server-side
 * memory/CPU must be sampled externally").
 *
 * Usage:
 *   npx tsx scripts/rc/loadTestSweep.ts --pid=9288
 *   npx tsx scripts/rc/loadTestSweep.ts --pid=9288 --levels=1,5,20,50
 *
 * The PID must be the actual node process listening on the API port (not the
 * `tsx watch` parent) — find it with:
 *   Get-NetTCPConnection -LocalPort 6002 -State Listen | Select OwningProcess
 */
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const pidArg = process.argv.find((a) => a.startsWith('--pid='));
const SERVER_PID = pidArg ? Number(pidArg.split('=')[1]) : undefined;
if (!SERVER_PID) {
  console.error('Usage: npx tsx scripts/rc/loadTestSweep.ts --pid=<server PID>');
  process.exit(1);
}

const levelsArg = process.argv.find((a) => a.startsWith('--levels='));
const LEVELS = levelsArg ? levelsArg.split('=')[1].split(',').map(Number) : [1, 5, 20, 50];

interface ProcSample {
  workingSetMB: number;
  privateMemMB: number;
  cpuSeconds: number;
}

async function sampleServerProcess(pid: number): Promise<ProcSample> {
  const { stdout } = await execFileAsync('powershell', [
    '-NoProfile',
    '-Command',
    `Get-Process -Id ${pid} | Select-Object WorkingSet64,PrivateMemorySize64,CPU | ConvertTo-Json`,
  ]);
  const data = JSON.parse(stdout) as { WorkingSet64: number; PrivateMemorySize64: number; CPU: number };
  return {
    workingSetMB: data.WorkingSet64 / 1024 / 1024,
    privateMemMB: data.PrivateMemorySize64 / 1024 / 1024,
    cpuSeconds: data.CPU,
  };
}

function extractMetric(output: string, label: string): string | null {
  const line = output.split('\n').find((l) => l.includes(label));
  return line ? line.trim() : null;
}

interface LevelResult {
  contributors: number;
  serverCpuDeltaSec: number;
  serverWorkingSetDeltaMB: number;
  serverWorkingSetAfterMB: number;
  wallMs: number;
  connectLine: string | null;
  joinLine: string | null;
  locationLine: string | null;
  fanoutLine: string | null;
}

async function runLevel(contributors: number): Promise<LevelResult> {
  console.log(`\n--- Load level: ${contributors} contributors ---`);
  const before = await sampleServerProcess(SERVER_PID!);

  const { stdout } = await execFileAsync(
    'npx',
    ['tsx', 'scripts/loadTestLiveTracking.ts', `--contributors=${contributors}`],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024, shell: true },
  );
  console.log(stdout);

  // Give the server a moment to settle so the "after" sample reflects the
  // test's actual cost, not an in-flight GC pause or trailing broadcast.
  await new Promise((r) => setTimeout(r, 500));
  const after = await sampleServerProcess(SERVER_PID!);

  const wallLine = extractMetric(stdout, 'Total wall time');
  const wallMsMatch = wallLine?.match(/([\d.]+)ms/);

  return {
    contributors,
    serverCpuDeltaSec: Math.max(0, after.cpuSeconds - before.cpuSeconds),
    serverWorkingSetDeltaMB: after.workingSetMB - before.workingSetMB,
    serverWorkingSetAfterMB: after.workingSetMB,
    wallMs: wallMsMatch ? Number(wallMsMatch[1]) : NaN,
    connectLine: extractMetric(stdout, 'Socket connect latency'),
    joinLine: extractMetric(stdout, 'join:trip ack latency'),
    locationLine: extractMetric(stdout, 'location:update ack latency'),
    fanoutLine: extractMetric(stdout, 'fanout latency'),
  };
}

async function main() {
  console.log(`=== RC1 Load Test Sweep — levels: ${LEVELS.join(', ')} — server PID ${SERVER_PID} ===`);
  const idleBefore = await sampleServerProcess(SERVER_PID!);
  console.log(`Server idle baseline: workingSet=${idleBefore.workingSetMB.toFixed(1)}MB privateMem=${idleBefore.privateMemMB.toFixed(1)}MB cpuTotal=${idleBefore.cpuSeconds.toFixed(2)}s`);

  const results: LevelResult[] = [];
  for (const level of LEVELS) {
    const result = await runLevel(level);
    results.push(result);
    // Cool-down between levels so one level's throttle/state doesn't bleed
    // into the next (session sets, throttle map entries, etc.).
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\n\n=== Benchmark Summary (server-side, real measurements) ===');
  console.log('contributors | serverCPUdelta(s) | serverMemDelta(MB) | serverMemAfter(MB) | wallTime(ms)');
  for (const r of results) {
    console.log(
      `${String(r.contributors).padStart(12)} | ${r.serverCpuDeltaSec.toFixed(2).padStart(17)} | ${r.serverWorkingSetDeltaMB.toFixed(1).padStart(19)} | ${r.serverWorkingSetAfterMB.toFixed(1).padStart(18)} | ${isNaN(r.wallMs) ? 'n/a'.padStart(12) : r.wallMs.toFixed(0).padStart(12)}`,
    );
  }
  console.log('\n=== Client-observed latency per level ===');
  for (const r of results) {
    console.log(`\n[${r.contributors} contributors]`);
    if (r.connectLine) console.log(`  ${r.connectLine}`);
    if (r.joinLine) console.log(`  ${r.joinLine}`);
    if (r.locationLine) console.log(`  ${r.locationLine}`);
    if (r.fanoutLine) console.log(`  ${r.fanoutLine}`);
  }

  console.log(`\nJSON: ${JSON.stringify({ idleBaseline: idleBefore, results })}`);
}

main().catch((err) => {
  console.error('Load test sweep failed:', err);
  process.exit(1);
});
