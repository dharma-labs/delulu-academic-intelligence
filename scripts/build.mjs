// Cross-platform build script for the Delulu academic app.
//
// Usage:
//   node scripts/build.mjs            -> standalone build (web hosting / full AI tutor)
//   node scripts/build.mjs export     -> static export (Capacitor, Electron, PWA, static hosts)
//
// The "export" path temporarily moves the server-only /api route handlers out of the
// Next.js app directory (route handlers cannot be statically exported), builds a pure
// static bundle into ./out, then restores them. The AI tutor already ships a graceful
// offline fallback, and can optionally call a remote API via NEXT_PUBLIC_API_BASE_URL.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] === 'export' ? 'export' : 'standalone';
const apiDir = join(root, 'src', 'app', 'api');
const apiOff = join(root, 'src', 'app', '_api');

const run = (cmd, env) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, env: { ...process.env, ...(env || {}) } });
};

if (mode === 'export') {
  const hadApi = existsSync(apiDir);
  let moved = false;
  if (hadApi) {
    renameSync(apiDir, apiOff);
    moved = true;
  }
  try {
    run('npx next build', { NEXT_OUTPUT: 'export' });
    console.log('\n✓ Static export written to ./out');
  } finally {
    if (moved) renameSync(apiOff, apiDir);
  }
} else {
  run('npx next build');
  cpSync(join(root, '.next', 'static'), join(root, '.next', 'standalone', '.next', 'static'), { recursive: true });
  cpSync(join(root, 'public'), join(root, '.next', 'standalone', 'public'), { recursive: true });
  console.log('\n✓ Standalone server written to .next/standalone (run: node .next/standalone/server.js)');
}
