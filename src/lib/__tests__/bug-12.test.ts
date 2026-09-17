import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('#12 onboarding gate', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
  });

  it('a first run starts empty so the onboarding gate can fire', () => {
    const s = useStore.getState();
    expect(s.hasOnboarded).toBe(false);
    expect(s.subjects).toEqual([]);
  });

  it('completeOnboarding records the flag (in state and in storage)', () => {
    useStore.getState().completeOnboarding();
    expect(useStore.getState().hasOnboarded).toBe(true);
    expect(localStorage.getItem('delulu-has-onboarded')).toBe('1');
  });

  it('loadDemoData populates the demo dataset on demand', () => {
    expect(useStore.getState().subjects).toEqual([]);
    useStore.getState().loadDemoData();
    expect(useStore.getState().subjects.length).toBeGreaterThan(0);
  });
});
