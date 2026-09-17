import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('store: boot + fix surface', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('boots with an empty first-run state and can load demo data on demand', () => {
    const s = useStore.getState();
    expect(Array.isArray(s.subjects)).toBe(true);
    expect(Array.isArray(s.attendance)).toBe(true);
    expect(Array.isArray(s.studySessions)).toBe(true);
    expect(s.hasOnboarded).toBe(false);

    useStore.getState().loadDemoData();
    expect(useStore.getState().subjects.length).toBeGreaterThan(0);
  });

  it('exposes every action the fixes touch', () => {
    const s = useStore.getState() as unknown as Record<string, unknown>;
    for (const n of ['addAttendance', 'addStudySession', 'startFocus', 'stopFocus', 'setFocusElapsed',
                     'exportData', 'importData', 'restoreDemoData', 'completeOnboarding',
                     'loadDemoData', 'resetState']) {
      expect(typeof s[n], n).toBe('function');
    }
  });
});
