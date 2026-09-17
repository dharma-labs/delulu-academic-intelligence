import { format, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import type {
  Assessment,
  AttendanceRecord,
  RevisionItem,
  StudySession,
  Subject,
  SyllabusUnit,
  Task,
} from './types';
import { classifyAttendance, pooledAttendancePercent } from './attendance-helpers';
import { formatDuration } from './duration';
export { formatDuration };

/**
 * Range summaries for the Home "Progress" section.
 *
 * Pure function over existing store records only — every number is derived from
 * real persisted data (studySessions / attendance / assessments / revisionItems /
 * tasks / syllabusUnits). Ranges whose underlying model has no date dimension
 * (e.g. syllabus completion has no completedAt) are reported as current totals
 * via `note` instead of being fabricated.
 */

export type HomeRangeId = 'today' | 'week' | 'month' | 'semester' | 'year' | 'all';

export const HOME_RANGES: { id: HomeRangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'semester', label: 'Semester' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
];

export type HomeMetricTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface HomeRangeMetric {
  label: string;
  value: string;
  hint?: string;
  tone?: HomeMetricTone;
  /** Optional route the number belongs to. */
  view?: string;
}

export interface HomeRangeSummary {
  id: HomeRangeId;
  metrics: HomeRangeMetric[];
  empty: boolean;
  /** Honest disclosure when a shown value is a current snapshot, not range data. */
  note?: string;
}

export interface HomeRangeInput {
  now?: Date;
  /** All subjects (health score semantics match the rest of the app). */
  allSubjects: Subject[];
  /** Subjects of the semester being viewed. */
  rangeSubjects: Subject[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  studySessions: StudySession[];
  revisionItems: RevisionItem[];
  tasks: Task[];
  syllabusUnits: SyllabusUnit[];
  semesterHealth: number;
  sgpa: number;
  cgpa: number;
  targetCgpa: number;
  attendanceThreshold: number;
}

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function attendanceStats(records: AttendanceRecord[]): { present: number; total: number; percentage: number } {
  const total = records.reduce((s, r) => s + r.totalClasses, 0);
  const present = records.filter((r) => r.present).reduce((s, r) => s + r.totalClasses, 0);
  return { present, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
}

/** Overall attendance for the scoped subjects — pooled, like every other surface. */
function averageSubjectAttendance(records: AttendanceRecord[], subjectIds: string[]): { percentage: number; present: number; total: number } {
  if (subjectIds.length === 0) return { percentage: 0, present: 0, total: 0 };
  let sum = 0;
  let present = 0;
  let total = 0;
  for (const id of subjectIds) {
    const stats = attendanceStats(records.filter((r) => r.subjectId === id));
    sum += stats.percentage;
    present += stats.present;
    total += stats.total;
  }
  return { percentage: pooledAttendancePercent(records.filter((r) => subjectIds.includes(r.subjectId))), present, total };
}

function averageSyllabusProgress(syllabusUnits: SyllabusUnit[], subjectIds: string[]): number {
  if (subjectIds.length === 0) return 0;
  let sum = 0;
  for (const id of subjectIds) {
    const topics = syllabusUnits.filter((u) => u.subjectId === id).flatMap((u) => u.topics);
    sum += topics.length > 0 ? Math.round((topics.filter((t) => t.completed).length / topics.length) * 100) : 0;
  }
  return Math.round(sum / subjectIds.length);
}

function attendanceTone(percentage: number, threshold: number): HomeMetricTone {
  const state = classifyAttendance(percentage, threshold);
  if (state === 'comfortable') return 'success';
  if (state === 'getting_tight') return 'warning';
  return 'danger';
}

export function buildHomeRangeSummary(id: HomeRangeId, input: HomeRangeInput): HomeRangeSummary {
  const now = input.now ?? new Date();
  const today = dayKey(now);
  const semesterIds = input.rangeSubjects.map((s) => s.id);
  const semesterIdSet = new Set(semesterIds);

  // Date windows only exist for the calendar ranges.
  const dateWindow: { from: string; to: string } | null =
    id === 'today'
      ? { from: today, to: today }
      : id === 'week'
        ? { from: dayKey(startOfWeek(now, { weekStartsOn: 1 })), to: today }
        : id === 'month'
          ? { from: dayKey(startOfMonth(now)), to: today }
          : id === 'year'
            ? { from: dayKey(startOfYear(now)), to: today }
            : null;

  const inWindow = (date?: string): boolean => {
    if (!date) return false;
    if (!dateWindow) return false;
    return date >= dateWindow.from && date <= dateWindow.to;
  };

  // Semester + all-time ranges are scoped by subject instead of by date.
  const scopedSessions = dateWindow
    ? input.studySessions.filter((s) => inWindow(s.date))
    : id === 'semester'
      ? input.studySessions.filter((s) => semesterIdSet.has(s.subjectId))
      : input.studySessions;

  const scopedAttendance = dateWindow
    ? input.attendance.filter((a) => inWindow(a.date))
    : id === 'semester'
      ? input.attendance.filter((a) => semesterIdSet.has(a.subjectId))
      : input.attendance;

  const scopedRevisions = dateWindow
    ? input.revisionItems.filter((r) => inWindow(r.lastReview))
    : id === 'semester'
      ? input.revisionItems.filter((r) => semesterIdSet.has(r.subjectId) && Boolean(r.lastReview))
      : input.revisionItems.filter((r) => Boolean(r.lastReview));

  const metrics: HomeRangeMetric[] = [];

  if (id === 'semester') {
    if (input.rangeSubjects.length === 0) {
      return { id, metrics: [], empty: true, note: 'No subjects in this semester yet.' };
    }

    metrics.push({
      label: 'Academic health',
      value: `${input.semesterHealth}`,
      hint: 'out of 100',
      tone: input.semesterHealth >= 75 ? 'success' : input.semesterHealth >= 50 ? 'neutral' : input.semesterHealth >= 30 ? 'warning' : 'danger',
    });

    const att = averageSubjectAttendance(input.attendance, semesterIds);
    if (att.total > 0) {
      metrics.push({
        label: 'Attendance',
        value: `${att.percentage}%`,
        hint: `${att.present} of ${att.total} classes`,
        tone: attendanceTone(att.percentage, input.attendanceThreshold),
        view: 'attendance',
      });
    }

    const syllabus = averageSyllabusProgress(input.syllabusUnits, semesterIds);
    metrics.push({
      label: 'Syllabus',
      value: `${syllabus}%`,
      hint: 'Average completion',
      view: 'subjects',
    });

    const studySeconds = scopedSessions.reduce((s, x) => s + x.duration, 0);
    metrics.push({
      label: 'Study time',
      value: formatDuration(studySeconds),
      hint: `${scopedSessions.length} session${scopedSessions.length === 1 ? '' : 's'}`,
      view: 'analytics',
    });

    if (input.sgpa > 0 || input.cgpa > 0) {
      metrics.push({
        label: 'Performance',
        value: input.sgpa > 0 ? input.sgpa.toFixed(2) : input.cgpa.toFixed(2),
        hint: input.sgpa > 0 ? `SGPA · CGPA ${input.cgpa.toFixed(2)}` : `CGPA · target ${input.targetCgpa}`,
        view: 'marks',
      });
    }

    return { id, metrics, empty: false };
  }

  if (id === 'all') {
    const att = attendanceStats(input.attendance);
    if (att.total > 0) {
      metrics.push({
        label: 'Attendance',
        value: `${att.percentage}%`,
        hint: `${att.present} of ${att.total} classes`,
        tone: attendanceTone(att.percentage, input.attendanceThreshold),
        view: 'attendance',
      });
    }

    const studySeconds = scopedSessions.reduce((s, x) => s + x.duration, 0);
    if (scopedSessions.length > 0) {
      metrics.push({
        label: 'Study time',
        value: formatDuration(studySeconds),
        hint: `${scopedSessions.length} sessions`,
        view: 'analytics',
      });
    }

    if (input.revisionItems.length > 0) {
      metrics.push({
        label: 'Revisions reviewed',
        value: `${scopedRevisions.length}`,
        hint: `of ${input.revisionItems.length} tracked`,
        view: 'revision',
      });
    }

    const syllabusIds = input.allSubjects.filter((s) => !s.archived).map((s) => s.id);
    if (syllabusIds.length > 0) {
      metrics.push({
        label: 'Syllabus',
        value: `${averageSyllabusProgress(input.syllabusUnits, syllabusIds)}%`,
        hint: 'Current total',
        view: 'subjects',
      });
    }

    if (input.cgpa > 0) {
      metrics.push({
        label: 'Performance',
        value: input.cgpa.toFixed(2),
        hint: `CGPA · target ${input.targetCgpa}`,
        view: 'marks',
      });
    }

    return { id, metrics, empty: metrics.length === 0 };
  }

  if (id === 'year') {
    if (scopedSessions.length > 0) {
      metrics.push({
        label: 'Study time',
        value: formatDuration(scopedSessions.reduce((s, x) => s + x.duration, 0)),
        hint: `${scopedSessions.length} session${scopedSessions.length === 1 ? '' : 's'} this year`,
        view: 'analytics',
      });
    }

    const yearAtt = attendanceStats(scopedAttendance);
    if (yearAtt.total > 0) {
      metrics.push({
        label: 'Attendance',
        value: `${yearAtt.percentage}%`,
        hint: `${yearAtt.present} of ${yearAtt.total} classes this year`,
        tone: attendanceTone(yearAtt.percentage, input.attendanceThreshold),
        view: 'attendance',
      });
    }

    const syllabusIds = input.allSubjects.filter((s) => !s.archived).map((s) => s.id);
    if (syllabusIds.length > 0) {
      metrics.push({
        label: 'Syllabus',
        value: `${averageSyllabusProgress(input.syllabusUnits, syllabusIds)}%`,
        hint: 'Current total',
        view: 'subjects',
      });
    }

    if (input.cgpa > 0) {
      metrics.push({
        label: 'Performance',
        value: input.cgpa.toFixed(2),
        hint: `CGPA · target ${input.targetCgpa}`,
        view: 'marks',
      });
    }

    return {
      id,
      metrics,
      empty: metrics.length === 0,
      note: metrics.length > 0
        ? 'Study time and attendance are year-to-date. Syllabus and performance are current totals — topic completion dates are not stored.'
        : undefined,
    };
  }

  // today / week / month — date-windowed ranges.
  if (scopedSessions.length > 0) {
    metrics.push({
      label: 'Study time',
      value: formatDuration(scopedSessions.reduce((s, x) => s + x.duration, 0)),
      hint: `${scopedSessions.length} session${scopedSessions.length === 1 ? '' : 's'}`,
      view: 'analytics',
    });
  }

  const att = attendanceStats(scopedAttendance);
  if (att.total > 0) {
    metrics.push({
      label: 'Attendance',
      value: `${att.percentage}%`,
      hint: `${att.present} of ${att.total} classes`,
      tone: attendanceTone(att.percentage, input.attendanceThreshold),
      view: 'attendance',
    });
  }

  const tasksInRange = input.tasks.filter((t) => !t.completed && inWindow(t.dueDate));
  const overdue = input.tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today);
  if (tasksInRange.length > 0) {
    metrics.push({
      label: 'Tasks due',
      value: `${tasksInRange.length}`,
      hint: overdue.length > 0 ? `${overdue.length} overdue overall` : 'Not completed yet',
      tone: overdue.length > 0 ? 'warning' : 'neutral',
      view: 'tasks',
    });
  }

  const scopedAssessments = input.assessments.filter((a) => inWindow(a.date));
  if (scopedAssessments.length > 0) {
    const obtained = scopedAssessments.reduce((s, a) => s + a.obtainedMarks, 0);
    const max = scopedAssessments.reduce((s, a) => s + a.maxMarks, 0);
    metrics.push({
      label: 'Assessments',
      value: `${scopedAssessments.length}`,
      hint: max > 0 ? `${Math.round((obtained / max) * 100)}% average` : 'Recorded',
      view: 'marks',
    });
  }

  if (scopedRevisions.length > 0) {
    metrics.push({
      label: 'Revisions reviewed',
      value: `${scopedRevisions.length}`,
      hint: 'Spaced repetition',
      view: 'revision',
    });
  }

  return { id, metrics: metrics.slice(0, 5), empty: metrics.length === 0 };
}
