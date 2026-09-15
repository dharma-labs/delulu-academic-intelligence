'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarCheck, ClipboardList, GraduationCap, ListChecks, type LucideIcon } from 'lucide-react';
import { useStore, calculateCGPA, getSubjectAttendance, getSubjectProgress } from '@/lib/store';
import { useSemesterFilter } from '@/lib/use-semester-filter';
import { cn } from '@/lib/utils';
import type { HomeMetricTone } from '@/lib/home-ranges';

/**
 * Academic snapshot — four compact surfaces (Attendance, Syllabus,
 * Performance, Tasks) in one grouped section.
 *
 * Every value is a real store value; every message is derived from an existing
 * threshold (profile.attendanceThreshold / profile.targetCGPA) or from real
 * counts (topics left, classes attended, overdue tasks). No thresholds are
 * invented here.
 */

const TONE_CLASS: Record<HomeMetricTone, string> = {
  neutral: 'text-foreground',
  success: 'text-[var(--delulu-success)]',
  warning: 'text-[var(--delulu-warning)]',
  danger: 'text-[var(--delulu-danger)]',
};

interface SnapshotSurface {
  label: string;
  value: string;
  message: string;
  tone: HomeMetricTone;
  icon: LucideIcon;
  view: string;
}

export function AcademicSnapshot({ className }: { className?: string }) {
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const attendance = useStore((s) => s.attendance);
  const assessments = useStore((s) => s.assessments);
  const tasks = useStore((s) => s.tasks);
  const profile = useStore((s) => s.profile);
  const navigate = useStore((s) => s.navigate);
  const { semesterSubjects } = useSemesterFilter();

  const surfaces = useMemo<SnapshotSurface[]>(() => {
    const list: SnapshotSurface[] = [];
    const threshold = profile.attendanceThreshold;

    // ── Attendance ──
    const attTotal = semesterSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).total, 0);
    const avgAttendance = semesterSubjects.length > 0
      ? Math.round(semesterSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).percentage, 0) / semesterSubjects.length)
      : 0;
    const hasAttendance = attTotal > 0;

    if (semesterSubjects.length > 0) {
      list.push({
        label: 'Attendance',
        value: hasAttendance ? `${avgAttendance}%` : '—',
        message: !hasAttendance
          ? 'No classes recorded yet'
          : avgAttendance >= threshold
            ? "You're doing well"
            : avgAttendance >= threshold - 10
              ? 'Slightly below target'
              : 'Below target',
        tone: !hasAttendance ? 'neutral' : avgAttendance >= threshold ? 'success' : avgAttendance >= threshold - 10 ? 'warning' : 'danger',
        icon: CalendarCheck,
        view: 'attendance',
      });
    }

    // ── Syllabus ──
    const semesterTopics = syllabusUnits
      .filter((u) => semesterSubjects.some((sub) => sub.id === u.subjectId))
      .flatMap((u) => u.topics);
    const avgSyllabus = semesterSubjects.length > 0
      ? Math.round(semesterSubjects.reduce((s, sub) => s + getSubjectProgress({ syllabusUnits }, sub.id), 0) / semesterSubjects.length)
      : 0;
    const topicsLeft = semesterTopics.filter((t) => !t.completed).length;

    list.push({
      label: 'Syllabus',
      value: semesterSubjects.length > 0 ? `${avgSyllabus}%` : '—',
      message: topicsLeft > 0
        ? `${topicsLeft} topic${topicsLeft === 1 ? '' : 's'} left`
        : semesterTopics.length > 0
          ? 'All topics done'
          : 'No topics tracked yet',
      // Syllabus has no threshold anywhere in the app, so no judgement tone.
      tone: 'neutral',
      icon: ClipboardList,
      view: 'subjects',
    });

    // ── Performance (CGPA vs the profile's own target) ──
    const cgpa = calculateCGPA({ subjects, assessments, profile });
    list.push({
      label: 'Performance',
      value: cgpa > 0 ? cgpa.toFixed(1) : '—',
      message: cgpa > 0
        ? cgpa >= profile.targetCGPA
          ? 'On track'
          : `Below ${profile.targetCGPA} target`
        : 'No marks recorded',
      tone: cgpa > 0 && cgpa >= profile.targetCGPA ? 'success' : 'neutral',
      icon: GraduationCap,
      view: 'marks',
    });

    // ── Tasks ──
    const today = format(new Date(), 'yyyy-MM-dd');
    const open = tasks.filter((t) => !t.completed);
    const dueToday = open.filter((t) => t.dueDate === today).length;
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
    list.push({
      label: 'Tasks',
      value: `${open.length}`,
      message: overdue > 0
        ? `${overdue} overdue`
        : dueToday > 0
          ? `${dueToday} due today`
          : open.length > 0
            ? 'Open, nothing urgent'
            : "You're clear",
      tone: overdue > 0 ? 'warning' : 'neutral',
      icon: ListChecks,
      view: 'tasks',
    });

    return list;
  }, [semesterSubjects, syllabusUnits, attendance, subjects, assessments, profile, tasks]);

  return (
    <section className={cn('space-y-3', className)} aria-label="Academic snapshot">
      <h2 className="text-sm font-medium">Academic Snapshot</h2>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {surfaces.map((surface) => {
          const Icon = surface.icon;
          return (
            <button
              key={surface.label}
              type="button"
              onClick={() => navigate(surface.view as never)}
              className="min-w-0 rounded-2xl bg-secondary/40 px-3.5 py-3.5 text-left transition-colors duration-200 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="text-xs">{surface.label}</span>
              </span>
              <span className={cn('mt-2 block text-2xl font-semibold tabular-nums tracking-tight', TONE_CLASS[surface.tone])}>
                {surface.value}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{surface.message}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
