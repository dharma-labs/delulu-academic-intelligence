import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('#3 focus timer writes through the store', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('startFocus marks the session active', () => {
    useStore.getState().startFocus('s1');
    expect(useStore.getState().focusActive).toBe(true);
    expect(useStore.getState().focusStartTime).toBeGreaterThan(0);
    expect(useStore.getState().focusElapsed).toBe(0);
  });

  it('setFocusElapsed updates focusElapsed via the action (no direct setState)', () => {
    useStore.getState().startFocus('s1');
    useStore.getState().setFocusElapsed(60);
    expect(useStore.getState().focusElapsed).toBe(60);
  });

  it('stopFocus closes the session and records a study session', () => {
    const before = useStore.getState().studySessions.length;
    useStore.getState().startFocus('s1');
    useStore.getState().setFocusElapsed(120);
    useStore.getState().stopFocus('done');
    const s = useStore.getState();
    expect(s.focusActive).toBe(false);
    expect(s.focusSubjectId).toBeNull();
    expect(s.focusElapsed).toBe(0);
    expect(s.studySessions.length).toBe(before + 1);
    expect(s.studySessions.at(-1)!.subjectId).toBe('s1');
  });
});
