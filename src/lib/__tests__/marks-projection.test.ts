import { describe, it, expect } from 'vitest';
import { eseMarksNeeded } from '@/lib/marks-projection';

describe('#16 one ESE projection', () => {
  it('computes the marks needed against the real maxima', () => {
    // target 70% of 100 total, 18 already obtained from IA (max 25)
    expect(eseMarksNeeded(18, 25, 75, 70)).toBe(52);
  });

  it('respects a 15/35 split (VAC/SEC papers)', () => {
    // target 70% of 50 total, 12 obtained from IA (max 15)
    expect(eseMarksNeeded(12, 15, 35, 70)).toBe(23);
  });

  it('never returns a negative requirement', () => {
    expect(eseMarksNeeded(90, 25, 75, 50)).toBe(0);
  });

  it('is 0 for an empty schema', () => {
    expect(eseMarksNeeded(0, 0, 0, 70)).toBe(0);
  });
});
