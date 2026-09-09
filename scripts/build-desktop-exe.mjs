// Wrapper: runs electron-builder with a dependency-free package.json.
// The desktop app is a pure static bundle served by Node built-ins (http/fs/path),
// so the packaged app needs ZERO npm dependencies. Stripping them makes
// electron-builder's node-modules scan instant and the asar tiny.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const backupPath = join(root, '.package.json.bak');

const original = JSON.parse(readFileSync(pkgPath, 'utf8'));

const minimal = {
  name: 'delulu',
  productName: 'Delulu',
  version: original.version || '0.2.1',
  description: 'Delulu — Delhi University Student Companion',
  author: 'Delulu',
  main: 'desktop/main.js',
  // NO dependencies — static bundle only
};

try {
  writeFileSync(backupPath, JSON.stringify(original, null, 2));
  writeFileSync(pkgPath, JSON.stringify(minimal, null, 2));
  console.log('• Stripped package.json for packaging (backup at .package.json.bak)');

  console.log('• Running electron-builder...');
  execSync('npx electron-builder --config desktop/electron-builder.yml --win', {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env },
  });
} finally {
  // Restore original package.json
  try {
    copyFileSync(backupPath, pkgPath);
    console.log('• Restored original package.json');
  } catch (e) {
    console.error('! Failed to restore package.json:', e.message);
  }
}
