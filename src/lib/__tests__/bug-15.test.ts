import { describe, it, expect } from 'vitest';
import { formatDuration } from '@/lib/duration';
import { escapeField } from '@/lib/csv-export';

describe('#15 single canonical helpers', () => {
  it('formatDuration is now the one implementation (minute/hour granularity)', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m');
    expect(formatDuration(8100)).toBe('2h 15m');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('opts.precise keeps seconds for live timers', () => {
    expect(formatDuration(90, { precise: true })).toBe('1m 30s');
    expect(formatDuration(45, { precise: true })).toBe('45s');
  });

  it('escapeField quotes only when the value needs it', () => {
    expect(escapeField('plain')).toBe('plain');
    expect(escapeField('a,b')).toBe('"a,b"');
    expect(escapeField('say "hi"')).toBe('"say ""hi"""');
  });
});
