import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('#11 AI Tutor removed from the wiring', () => {
  const files = [
    'src/components/view-router.tsx',
    'src/lib/types.ts',
    'src/components/app-shell.tsx',
    'public/manifest.json',
  ];

  it.each(files)('%s no longer references ai-tutor', (f) => {
    const text = readFileSync(f, 'utf8');
    expect(text.includes('ai-tutor')).toBe(false);
  });
});
