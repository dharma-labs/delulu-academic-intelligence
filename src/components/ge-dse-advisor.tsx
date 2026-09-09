'use client';

import { useState, useEffect } from 'react';
import { loadCourses } from '@/lib/du-data-loader';
import type { DUProgramme } from '@/lib/du-data-loader';
import { useStore } from '@/lib/store';
import { BookOpen, Info } from 'lucide-react';

/**
 * GE/DSE Selector Advisor — informational only.
 * Lists available GE/DSE options under covered programmes.
 * Does NOT rank or recommend based on "ease" or "scoring".
 */
export function GEDSEAdvisor() {
  const [programmes, setProgrammes] = useState<DUProgramme[]>([]);
  const profile = useStore((s) => s.profile);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadCourses().then(data => setProgrammes(data.programmes));
  }, []);

  const userProgramme = profile.course
    ? programmes.find(p => p.name === profile.course)
    : null;

  const relevantProgrammes = userProgramme ? [userProgramme] : programmes;

  if (programmes.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        GE/DSE Options
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
          Informational — not ranked by difficulty
        </span>
      </div>

      {relevantProgrammes.map(prog => {
        const gePapers: { sem: number; name: string; credits: number; upcCode: string | null; verified: boolean }[] = [];
        const dsePapers: typeof gePapers = [];

        for (const sem of prog.semesters) {
          for (const paper of sem.papers) {
            if (paper.courseType === 'GE') {
              gePapers.push({ sem: sem.semester, name: paper.name, credits: paper.credits, upcCode: paper.upcCode, verified: paper.verified });
            }
            if (paper.courseType === 'DSE') {
              dsePapers.push({ sem: sem.semester, name: paper.name, credits: paper.credits, upcCode: paper.upcCode, verified: paper.verified });
            }
          }
        }

        if (gePapers.length === 0 && dsePapers.length === 0) return null;

        const isExpanded = expanded === prog.code;

        return (
          <div key={prog.code} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : prog.code)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium">{prog.name}</span>
              <span className="text-xs text-muted-foreground">
                {gePapers.length} GE · {dsePapers.length} DSE
                {isExpanded ? ' ▲' : ' ▼'}
              </span>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 text-xs">
                {gePapers.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Generic Electives (GE)</p>
                    <div className="space-y-1">
                      {gePapers.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 py-0.5">
                          <span className="text-muted-foreground shrink-0">Sem {p.sem}:</span>
                          <span>
                            {p.name}
                            <span className="text-muted-foreground"> ({p.credits} cr)</span>
                            {!p.verified && <span className="text-amber-500 ml-1">&#9888;</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {dsePapers.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Discipline Specific Electives (DSE)</p>
                    <div className="space-y-1">
                      {dsePapers.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 py-0.5">
                          <span className="text-muted-foreground shrink-0">Sem {p.sem}:</span>
                          <span>
                            {p.name}
                            <span className="text-muted-foreground"> ({p.credits} cr)</span>
                            {!p.verified && <span className="text-amber-500 ml-1">&#9888;</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-1.5 text-muted-foreground pt-1 border-t border-border">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    This is factual course information from DU UGCF 2022 syllabi.
                    It does not rank papers by difficulty or scoring patterns — that would require real aggregated grade-distribution data which is not available.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
