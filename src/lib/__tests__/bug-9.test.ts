import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';
import { getSubjectAttendance } from '@/lib/store';

describe('#9 IA/ESE marks have a writer', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState(), true);
    useStore.getState().loadDemoData(); // demo subjects, for a realistic subject row
  });

  it('updateSubject persists internalMarksObtained / endSemMarksObtained', () => {
    const id = useStore.getState().subjects[0].id;
    useStore.getState().updateSubject(id, {
      internalMarksObtained: 18,
      endSemMarksObtained: 52,
    });
    const subj = useStore.getState().subjects.find((s) => s.id === id)!;
    expect(subj.internalMarksObtained).toBe(18);
    expect(subj.endSemMarksObtained).toBe(52);
  });

  it('the fields survive an export/import round trip (they were dead before)', () => {
    const id = useStore.getState().subjects[0].id;
    useStore.getState().updateSubject(id, { internalMarksObtained: 21 });
    const json = useStore.getState().exportData();
    useStore.getState().resetState();
    useStore.getState().importData(json);
    const subj = useStore.getState().subjects.find((s) => s.id === id)!;
    expect(subj.internalMarksObtained).toBe(21);
  });

  it('readers now see real data instead of undefined', () => {
    const id = useStore.getState().subjects[0].id;
    useStore.getState().updateSubject(id, { internalMarksObtained: 20, endSemMarksObtained: 60 });
    const subj = useStore.getState().subjects.find((s) => s.id === id)!;
    const iaMax = subj.internalMarksMax ?? 0;
    const eseMax = subj.endSemMarksMax ?? 0;
    // mirrors ia-ese-split.tsx:14,16 and marks.tsx:353-364
    expect((subj.internalMarksObtained ?? 0) / iaMax).toBeGreaterThan(0);
    expect(subj.endSemMarksObtained).not.toBeUndefined();
    // and the attendance reader still works on the same subject
    expect(getSubjectAttendance({ attendance: useStore.getState().attendance }, id).percentage).toBeGreaterThanOrEqual(0);
  });
});
