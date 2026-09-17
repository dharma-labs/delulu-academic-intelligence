import { describe, it, expect } from 'vitest';
import { classifyAttendance, getAttendanceState } from '@/lib/attendance-helpers';
import { GRADE_FROM_PERCENTAGE } from '@/lib/types';

describe('#8 single canonical attendance + grade logic', () => {
  it('classifyAttendance has one band definition', () => {
    expect(classifyAttendance(80, 70)).toBe('comfortable'); // >= threshold + 10
    expect(classifyAttendance(70, 70)).toBe('getting_tight'); // >= threshold
    expect(classifyAttendance(69, 70)).toBe('at_risk'); // < threshold
  });

  it('getAttendanceState inherits the same bands (no separate 66.67/50 logic)', () => {
    expect(getAttendanceState(80, 70).variant).toBe('on-track');
    expect(getAttendanceState(70, 70).variant).toBe('below-threshold');
    expect(getAttendanceState(10, 70).variant).toBe('needs-attention');
    // default threshold still 66.67 for existing one-arg callers
    expect(getAttendanceState(90).variant).toBe('on-track');
    expect(getAttendanceState(40).variant).toBe('needs-attention');
  });

  it('GRADE_FROM_PERCENTAGE is the single grade table', () => {
    expect(GRADE_FROM_PERCENTAGE(80)).toBe('A+');
    expect(GRADE_FROM_PERCENTAGE(70)).toBe('A');
    expect(GRADE_FROM_PERCENTAGE(39)).toBe('F');
  });
});
