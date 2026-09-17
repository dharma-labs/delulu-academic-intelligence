import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('#1 addAttendance date', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('stores a caller-supplied past date verbatim', () => {
    const before = useStore.getState().attendance.length;
    useStore.getState().addAttendance({
      subjectId: 's1', date: '2026-09-01', present: true, totalClasses: 1,
    });
    const rec = useStore.getState().attendance.at(-1)!;
    expect(useStore.getState().attendance.length).toBe(before + 1);
    expect(rec.date).toBe('2026-09-01');
    expect(rec.present).toBe(true);
  });

  it('defaults to today when date is omitted', () => {
    const today = new Date().toISOString().split('T')[0];
    useStore.getState().addAttendance({
      subjectId: 's1', present: false, totalClasses: 1,
    } as any);
    expect(useStore.getState().attendance.at(-1)!.date).toBe(today);
  });
});
