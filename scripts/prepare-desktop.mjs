// Copy the static export (./out) into desktop/dist so electron-builder can package it.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'out');
const dist = join(root, 'desktop', 'dist');

if (!existsSync(join(out, 'index.html'))) {
  console.error('✗ ./out/index.html not found. Run `npm run build:export` first.');
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
cpSync(out, dist, { recursive: true });
console.log('✓ Copied out/ -> desktop/dist');
