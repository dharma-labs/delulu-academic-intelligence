import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('store: boot + fix surface', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('boots with seeded demo data', () => {
    const s = useStore.getState();
    expect(s.subjects.length).toBeGreaterThan(0);
    expect(Array.isArray(s.attendance)).toBe(true);
    expect(Array.isArray(s.studySessions)).toBe(true);
  });

  it('exposes every action the fixes touch', () => {
    const s = useStore.getState() as unknown as Record<string, unknown>;
    for (const n of ['addAttendance', 'addStudySession', 'startFocus', 'stopFocus',
                     'exportData', 'importData', 'restoreDemoData', 'resetState']) {
      expect(typeof s[n], n).toBe('function');
    }
  });
});
