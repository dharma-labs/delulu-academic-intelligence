'use client';

import { useMemo, useState } from 'react';
import { useStore, calculateCGPA, calculateSGPA, getSemesterHealth } from '@/lib/store';
import { useSemesterFilter } from '@/lib/use-semester-filter';
import { cn } from '@/lib/utils';
import {
  buildHomeRangeSummary,
  HOME_RANGES,
  type HomeMetricTone,
  type HomeRangeId,
} from '@/lib/home-ranges';

const TONE_CLASS: Record<HomeMetricTone, string> = {
  neutral: 'text-foreground',
  success: 'text-[var(--delulu-success)]',
  warning: 'text-[var(--delulu-warning)]',
  danger: 'text-[var(--delulu-danger)]',
};

/**
 * Progress - progressive disclosure with a segmented control.
 *
 * Selecting a segment replaces the summary; ranges are never stacked. All
 * numbers are derived from real records (see lib/home-ranges).
 */
export function ProgressSummary({ className }: { className?: string }) {
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const attendance = useStore((s) => s.attendance);
  const assessments = useStore((s) => s.assessments);
  const studySessions = useStore((s) => s.studySessions);
  const revisionItems = useStore((s) => s.revisionItems);
  const tasks = useStore((s) => s.tasks);
  const profile = useStore((s) => s.profile);
  const navigate = useStore((s) => s.navigate);
  const { semesterSubjects } = useSemesterFilter();

  const [range, setRange] = useState<HomeRangeId>('week');

  const summary = useMemo(
    () =>
      buildHomeRangeSummary(range, {
        allSubjects: subjects,
        rangeSubjects: semesterSubjects,
        attendance,
        assessments,
        studySessions,
        revisionItems,
        tasks,
        syllabusUnits,
        semesterHealth: getSemesterHealth({ subjects, syllabusUnits, assessments, attendance, revisionItems, profile } as never),
        sgpa: calculateSGPA({ subjects, assessments }),
        cgpa: calculateCGPA({ subjects, assessments, profile }),
        targetCgpa: profile.targetCGPA,
        attendanceThreshold: profile.attendanceThreshold,
      }),
    [range, subjects, semesterSubjects, attendance, assessments, studySessions, revisionItems, tasks, syllabusUnits, profile]
  );

  return (
    <section className={cn('space-y-5', className)} aria-label="Progress">
      <h2 className="text-sm font-medium">Progress</h2>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-secondary/60 p-1 scrollbar-none" role="tablist" aria-label="Progress range">
        {HOME_RANGES.map((r) => {
          const selected = r.id === range;
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setRange(r.id)}
              className={cn(
                'shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                selected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {summary.empty ? (
        <p className="text-sm text-muted-foreground">
          Nothing recorded yet for this period.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {summary.metrics.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => m.view && navigate(m.view as never)}
              className="min-w-0 rounded-xl px-2 py-1 text-left transition-colors hover:bg-muted/40"
            >
              <span className={cn('block text-lg font-semibold tabular-nums tracking-tight', TONE_CLASS[m.tone ?? 'neutral'])}>
                {m.value}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{m.label}</span>
              {m.hint && (
                <span className="mt-0.5 block text-xs text-muted-foreground/70">{m.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {summary.note && !summary.empty && (
        <p className="text-xs text-muted-foreground/80">{summary.note}</p>
      )}
    </section>
  );
}
