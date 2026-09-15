'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { useStore, calculateCGPA, getSubjectAttendance, getSubjectProgress } from '@/lib/store';
import { useSemesterFilter } from '@/lib/use-semester-filter';
import { cn } from '@/lib/utils';
import type { HomeMetricTone } from '@/lib/home-ranges';

interface SnapshotRow {
  label: string;
  value: string;
  hint?: string;
  tone?: HomeMetricTone;
  view: string;
}

const TONE_CLASS: Record<HomeMetricTone, string> = {
  neutral: 'text-foreground',
  success: 'text-[var(--delulu-success)]',
  warning: 'text-[var(--delulu-warning)]',
  danger: 'text-[var(--delulu-danger)]',
};

/**
 * Academic snapshot — one quiet grouped surface (label / value list).
 *
 * Replaces the old micro-metric strip and the four separate metric cards.
 * Every value comes from the store via the same helpers used across the app.
 */
export function AcademicSnapshot({ className }: { className?: string }) {
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const attendance = useStore((s) => s.attendance);
  const assessments = useStore((s) => s.assessments);
  const tasks = useStore((s) => s.tasks);
  const profile = useStore((s) => s.profile);
  const navigate = useStore((s) => s.navigate);
  const { semesterSubjects } = useSemesterFilter();

  const rows = useMemo<SnapshotRow[]>(() => {
    const list: SnapshotRow[] = [];
    const threshold = profile.attendanceThreshold;

    const attTotal = semesterSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).total, 0);
    const attPresent = semesterSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).present, 0);
    const avgAttendance = semesterSubjects.length > 0
      ? Math.round(semesterSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).percentage, 0) / semesterSubjects.length)
      : 0;

    if (semesterSubjects.length > 0) {
      list.push({
        label: 'Attendance',
        value: attTotal > 0 ? `${avgAttendance}%` : '—',
        hint: attTotal > 0 ? `${attPresent} of ${attTotal} classes` : 'No classes recorded',
        tone: attTotal === 0 ? 'neutral' : avgAttendance >= threshold ? 'success' : avgAttendance >= threshold - 10 ? 'warning' : 'danger',
        view: 'attendance',
      });
    }

    const avgSyllabus = semesterSubjects.length > 0
      ? Math.round(semesterSubjects.reduce((s, sub) => s + getSubjectProgress({ syllabusUnits }, sub.id), 0) / semesterSubjects.length)
      : 0;

    list.push({
      label: 'Syllabus',
      value: semesterSubjects.length > 0 ? `${avgSyllabus}%` : '—',
      hint: semesterSubjects.length > 0 ? `Across ${semesterSubjects.length} subject${semesterSubjects.length === 1 ? '' : 's'}` : 'No subjects yet',
      view: 'subjects',
    });

    const cgpa = calculateCGPA({ subjects, assessments, profile });
    list.push({
      label: 'Performance',
      value: cgpa > 0 ? cgpa.toFixed(1) : '—',
      hint: cgpa > 0 ? `CGPA · target ${profile.targetCGPA}` : 'No marks recorded',
      tone: cgpa > 0 && cgpa >= profile.targetCGPA ? 'success' : 'neutral',
      view: 'marks',
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    const open = tasks.filter((t) => !t.completed);
    const dueToday = open.filter((t) => t.dueDate === today).length;
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
    list.push({
      label: 'Tasks',
      value: `${open.length}`,
      hint: open.length === 0
        ? 'Nothing open'
        : overdue > 0
          ? `${overdue} overdue${dueToday > 0 ? ` · ${dueToday} due today` : ''}`
          : dueToday > 0 ? `${dueToday} due today` : 'Open',
      tone: overdue > 0 ? 'warning' : 'neutral',
      view: 'tasks',
    });

    return list;
  }, [semesterSubjects, attendance, syllabusUnits, subjects, assessments, profile, tasks]);

  return (
    <section
      className={cn('rounded-3xl border border-border/60 bg-card p-5 md:p-6', className)}
      aria-label="Academic snapshot"
    >
      <h2 className="text-sm font-medium">Snapshot</h2>
      <div className="mt-3 space-y-1">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => navigate(row.view as never)}
            className="flex w-full items-baseline justify-between gap-4 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0 truncate text-sm text-muted-foreground">{row.label}</span>
            <span className="shrink-0 text-right">
              <span className={cn('block text-base font-semibold tabular-nums', TONE_CLASS[row.tone ?? 'neutral'])}>
                {row.value}
              </span>
              {row.hint && (
                <span className="block text-xs text-muted-foreground/80">{row.hint}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
