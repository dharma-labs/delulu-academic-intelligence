import { describe, it, expect } from 'vitest';
import { pooledAttendancePercent } from '@/lib/attendance-helpers';

describe('#15 one definition of overall attendance', () => {
  const rec = (present: boolean, totalClasses: number) =>
    ({ id: 'x', subjectId: 's', date: '2026-09-01', present, totalClasses }) as never;

  it('weights by classes held, not by subject count', () => {
    // subject A: 1/1 = 100% (1 class);  subject B: 0/9 = 0% (9 classes)
    // mean-of-percentages would say 50%; pooled correctly says 10%
    const records = [rec(true, 1), rec(false, 9)];
    expect(pooledAttendancePercent(records)).toBe(10);
  });

  it('is 0 with no records and 100 when everything was attended', () => {
    expect(pooledAttendancePercent([])).toBe(0);
    expect(pooledAttendancePercent([rec(true, 3), rec(true, 7)])).toBe(100);
  });

  it('matches a hand-computed pooled figure', () => {
    // present 18+22=40 of 20+30=50 classes -> 80%
    expect(pooledAttendancePercent([rec(true, 18), rec(true, 22), rec(false, 10)])).toBe(80);
  });
});
