import { useState, useEffect, useCallback } from 'react';
import { loadCourses, findMatchingPaper } from '@/lib/du-data-loader';
import type { DUProgramme, DUPaper } from '@/lib/du-data-loader';
import { useStore } from '@/lib/store';

/**
 * Hook for UPC auto-populate.
 * When a user on a covered programme types a subject name,
 * look up the matching paper and return its pre-fill data.
 */
export function useUPCAutoPopulate() {
  const [programmes, setProgrammes] = useState<DUProgramme[]>([]);
  const profile = useStore((s) => s.profile);

  useEffect(() => {
    loadCourses().then(data => setProgrammes(data.programmes));
  }, []);

  const lookup = useCallback(
    (subjectName: string, semester?: number): Partial<DUPaper> | null => {
      if (!profile.course || !subjectName) return null;
      const sem = semester || profile.currentSemester || 1;
      const paper = findMatchingPaper(programmes, profile.course, subjectName, sem);
      if (!paper) return null;
      return {
        upcCode: paper.upcCode,
        credits: paper.credits,
        courseType: paper.courseType as any,
        internalMarksMax: paper.internalMarksMax,
        endSemMarksMax: paper.endSemMarksMax,
      };
    },
    [programmes, profile.course, profile.currentSemester]
  );

  return { lookup, programmes };
}
