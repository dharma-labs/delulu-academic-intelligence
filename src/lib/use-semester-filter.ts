import { useMemo } from 'react';
import { useStore } from '@/lib/store';

export function useSemesterFilter() {
  const profile = useStore((s) => s.profile);
  const subjects = useStore((s) => s.subjects);
  // Selection lives in the store so every view + the switcher stay in sync.
  const selectedSemester = useStore((s) => s.selectedSemester);
  const setSelectedSemester = useStore((s) => s.setSelectedSemester);
  const currentSemester = profile.currentSemester || profile.semester || 1;
  const activeSemester = selectedSemester ?? currentSemester;
  const availableSemesters = useMemo(() => {
    const sems = new Set(subjects.map((s) => s.semester));
    sems.add(currentSemester);
    return Array.from(sems).sort((a, b) => a - b);
  }, [subjects, currentSemester]);
  const semesterSubjects = useMemo(
    () => subjects.filter((s) => s.semester === activeSemester && !s.archived),
    [subjects, activeSemester]
  );
  return { activeSemester, selectedSemester, setSelectedSemester, currentSemester, availableSemesters, semesterSubjects, isViewingPast: activeSemester < currentSemester };
}
