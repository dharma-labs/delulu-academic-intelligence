/**
 * Local verification gate: type-check summary + test suite.
 * Usage: npm run verify
 * Exit code: non-zero only if the TEST SUITE fails. Type errors are reported
 * (and counted) but do not fail the run while the backlog in DELIVERY/ is open —
 * flip STRICT_TYPES to true once the ~37 errors are cleared and ignoreBuildErrors is false.
 */
import { execSync } from 'node:child_process';

const STRICT_TYPES = false;

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
  }
}

console.log('\n=== 1/2  type check (tsc --noEmit) ===');
const tsc = run('npx --no-install tsc --noEmit --incremental false');
const errors = (tsc.out.match(/error TS/g) || []).length;
if (tsc.ok) {
  console.log('  PASS - no type errors');
} else {
  console.log(`  ${STRICT_TYPES ? 'FAIL' : 'WARN'} - ${errors} type error(s)`);
  console.log('  (non-blocking until the type-cleanup task flips ignoreBuildErrors)');
}

console.log('\n=== 2/2  test suite (vitest run) ===');
const test = run('npx vitest run');
const summary = test.out.split('\n').filter((l) => /Test Files|Tests\s/.test(l)).join('\n');
console.log(summary ? summary.replace(/\u001b\[\d+m/g, '') : test.out.slice(-800));

const failed = /failed/i.test(summary || '');
if (failed || !test.ok) {
  console.error('\nGATE: FAILED (tests)\n');
  process.exit(1);
}
if (STRICT_TYPES && !tsc.ok) {
  console.error('\nGATE: FAILED (types)\n');
  process.exit(1);
}
console.log('\nGATE: PASSED\n');
