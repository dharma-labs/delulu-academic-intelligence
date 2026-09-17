import { describe, it, expect } from 'vitest';
import { ymd, todayYMD, ymdPlusDays } from '@/lib/date-utils';

describe('local date semantics (one definition of "today")', () => {
  it('ymd formats the LOCAL wall-clock date', () => {
    // 17 Sep 2026, 00:30 local — the old UTC pattern returned the previous day in IST
    const d = new Date(2026, 8, 17, 0, 30, 0);
    expect(ymd(d)).toBe('2026-09-17');
  });

  it('ymd is well-formed and zero-padded', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('todayYMD returns a valid date string', () => {
    expect(todayYMD()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ymdPlusDays advances by whole local days', () => {
    const t = new Date();
    t.setDate(t.getDate() + 3);
    expect(ymdPlusDays(3)).toBe(ymd(t));
  });
});
