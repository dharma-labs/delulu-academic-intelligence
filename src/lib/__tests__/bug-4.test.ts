import { describe, it, expect } from 'vitest';
import { useStore } from '@/lib/store';

describe('#4 migrate', () => {
  it('does not re-seed an intentionally empty studySessions array', () => {
    const opts = (useStore as any).persist.getOptions();
    const out = opts.migrate({ profile: {}, subjects: [], studySessions: [] }, 0);
    expect(out.studySessions).toEqual([]); // pre-fix: seeded with demo sessions
  });
});
