import { format, startOfWeek } from 'date-fns';
import type {
  Assessment,
  Assignment,
  AttendanceRecord,
  Exam,
  RevisionItem,
  StudySession,
  Subject,
  SyllabusUnit,
  Task,
  UserProfile,
} from './types';
import { getSubjectAttendance, getSubjectProgress, getSubjectSignal } from './store';

/**
 * Pure "intelligence" helpers for the Home screen.
 *
 * Ported from the dashboard so the quiet insight line and the deeper sections
 * share one implementation (no duplicated or recomputed logic in components).
 */

export interface HomeIntelInput {
  subjects: Subject[];
  /** Subjects of the semester currently being viewed. */
  activeSubjects: Subject[];
  syllabusUnits: SyllabusUnit[];
  exams: Exam[];
  assignments: Assignment[];
  tasks: Task[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  revisionItems: RevisionItem[];
  studySessions: StudySession[];
  profile: UserProfile;
}

export type HomeUrgency = 'critical' | 'attention' | 'info';

export interface HomeRecommendation {
  title: string;
  description: string;
  urgency: HomeUrgency;
  actionLabel: string;
  view: string;
  subjectId?: string;
}

export interface HomeInsight {
  type: 'positive' | 'warning' | 'critical' | 'info';
  title: string;
  description?: string;
}

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function daysUntil(date: string): number {
  const today = todayKey();
  return Math.ceil(
    (new Date(date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
  );
}

export function buildHomeRecommendations(input: HomeIntelInput): HomeRecommendation[] {
  const items: HomeRecommendation[] = [];
  const today = todayKey();
  const syllState = { syllabusUnits: input.syllabusUnits };

  // 1. Lowest-progress subject with an unfinished topic.
  const sortedByProgress = [...input.activeSubjects]
    .map((subject) => ({ subject, progress: getSubjectProgress(syllState, subject.id) }))
    .sort((a, b) => a.progress - b.progress);

  for (const { subject, progress } of sortedByProgress) {
    if (progress >= 100) continue;
    const incomplete = input.syllabusUnits
      .filter((u) => u.subjectId === subject.id)
      .flatMap((u) => u.topics)
      .find((t) => !t.completed);
    if (incomplete) {
      items.push({
        title: incomplete.name,
        description: `${subject.name} · ${progress}% complete`,
        urgency: 'attention',
        actionLabel: 'Study',
        view: 'focus',
        subjectId: subject.id,
      });
      break;
    }
  }

  // 2. Nearest exam or assignment deadline.
  const nextExam = input.exams
    .filter((e) => e.status !== 'completed' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const nextAssignment = input.assignments
    .filter((a) => a.status !== 'completed' && a.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0] ?? null;

  let deadline: { title: string; date: string; subjectId?: string; exam: boolean } | null = null;
  if (nextExam && nextAssignment) {
    deadline = nextExam.date <= nextAssignment.deadline
      ? { title: nextExam.name, date: nextExam.date, subjectId: nextExam.subjectId, exam: true }
      : { title: nextAssignment.title, date: nextAssignment.deadline, subjectId: nextAssignment.subjectId, exam: false };
  } else if (nextExam) {
    deadline = { title: nextExam.name, date: nextExam.date, subjectId: nextExam.subjectId, exam: true };
  } else if (nextAssignment) {
    deadline = { title: nextAssignment.title, date: nextAssignment.deadline, subjectId: nextAssignment.subjectId, exam: false };
  }

  if (deadline) {
    const days = daysUntil(deadline.date);
    const subjectName = input.subjects.find((s) => s.id === deadline?.subjectId)?.name ?? '';
    items.push({
      title: deadline.title,
      description: `${subjectName}${subjectName ? ' · ' : ''}${days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days}d`}`,
      urgency: days <= 1 ? 'critical' : 'attention',
      actionLabel: days <= 1 ? 'Prepare' : 'Open',
      view: 'subject-detail',
      subjectId: deadline.subjectId,
    });
  }

  // 3. Attendance below the profile threshold.
  const lowestAtt = input.activeSubjects
    .map((subject) => ({ subject, att: getSubjectAttendance({ attendance: input.attendance }, subject.id) }))
    .filter((x) => x.att.total > 0)
    .sort((a, b) => a.att.percentage - b.att.percentage)[0];

  if (lowestAtt && lowestAtt.att.percentage < input.profile.attendanceThreshold) {
    items.push({
      title: `${lowestAtt.subject.name} attendance`,
      description: `${lowestAtt.att.percentage}% · need ${input.profile.attendanceThreshold}%`,
      urgency: lowestAtt.att.percentage < input.profile.attendanceThreshold - 5 ? 'critical' : 'attention',
      actionLabel: 'View',
      view: 'attendance',
      subjectId: lowestAtt.subject.id,
    });
  }

  return items;
}

export function buildHomeInsights(input: HomeIntelInput): HomeInsight[] {
  const result: HomeInsight[] = [];
  const intel = {
    subjects: input.subjects,
    attendance: input.attendance,
    assessments: input.assessments,
    syllabusUnits: input.syllabusUnits,
    revisionItems: input.revisionItems,
    profile: input.profile,
  };

  const subjectSignals = input.activeSubjects.map((subject) => ({
    subject,
    att: getSubjectAttendance({ attendance: input.attendance }, subject.id),
    signal: getSubjectSignal(intel as never, subject.id),
  }));

  const atRisk = subjectSignals.filter((s) => s.signal === 'critical' || s.signal === 'attention');
  if (atRisk.length > 0) {
    result.push({
      type: 'warning',
      title: `${atRisk.length} subject${atRisk.length > 1 ? 's' : ''} need attention`,
      description: atRisk.map((s) => s.subject.name).join(', '),
    });
  }

  const dueRevisions = input.revisionItems.filter((r) => r.nextReview <= todayKey()).length;
  if (dueRevisions > 0) {
    result.push({
      type: 'info',
      title: `${dueRevisions} revision${dueRevisions > 1 ? 's' : ''} due`,
      description: 'Ready for review in your spaced repetition queue',
    });
  }

  const lowAtt = subjectSignals.filter((s) => s.att.total > 0 && s.att.percentage < input.profile.attendanceThreshold);
  if (lowAtt.length > 0) {
    result.push({
      type: lowAtt.some((s) => s.att.percentage < input.profile.attendanceThreshold - 5) ? 'critical' : 'warning',
      title: `Attendance below ${input.profile.attendanceThreshold}%`,
      description: lowAtt.map((s) => `${s.subject.name} (${s.att.percentage}%)`).join(', '),
    });
  }

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekSessions = input.studySessions.filter((s) => s.date >= weekStart).length;
  if (weekSessions >= 5) {
    result.push({
      type: 'positive',
      title: `${weekSessions} study sessions this week`,
      description: 'Consistent study pattern detected',
    });
  } else if (weekSessions === 0 && input.studySessions.length > 0) {
    result.push({
      type: 'warning',
      title: 'No study sessions yet this week',
      description: 'Start a focus session to rebuild momentum',
    });
  }

  return result.slice(0, 4);
}

export function buildStudyPatterns(input: HomeIntelInput): HomeInsight[] {
  const patterns: HomeInsight[] = [];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekSessions = input.studySessions.filter((s) => s.date >= weekStart);

  const totalWeekSec = weekSessions.reduce((a, s) => a + s.duration, 0);
  const avgSessionMin = weekSessions.length > 0 ? Math.round(totalWeekSec / weekSessions.length / 60) : 0;

  const dayTotals: Record<string, number> = {};
  weekSessions.forEach((s) => {
    dayTotals[s.date] = (dayTotals[s.date] || 0) + s.duration;
  });
  const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
  if (bestDay) {
    patterns.push({
      type: 'info',
      title: `Most productive: ${format(new Date(bestDay[0] + 'T12:00:00'), 'EEEE')}`,
      description: `${Math.round(bestDay[1] / 60)}m of study time`,
    });
  }

  if (avgSessionMin > 0 && avgSessionMin < 25) {
    patterns.push({
      type: 'warning',
      title: 'Short sessions detected',
      description: `Average ${avgSessionMin}m — try 25+ minute blocks for deeper focus`,
    });
  } else if (avgSessionMin >= 45) {
    patterns.push({
      type: 'positive',
      title: 'Great session length',
      description: `Average ${avgSessionMin}m — solid deep work sessions`,
    });
  }

  const uncovered = input.activeSubjects.filter((s) => !weekSessions.some((ws) => ws.subjectId === s.id));
  if (uncovered.length > 0 && uncovered.length < input.activeSubjects.length) {
    patterns.push({
      type: 'info',
      title: `${uncovered.length} subject${uncovered.length > 1 ? 's' : ''} not studied this week`,
      description: uncovered.map((s) => s.name).join(', '),
    });
  }

  if (input.assessments.length >= 2) {
    const recent = [...input.assessments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const avgPct = recent.reduce((a, x) => a + (x.obtainedMarks / x.maxMarks) * 100, 0) / recent.length;
    const predicted = avgPct >= 90 ? 'O' : avgPct >= 80 ? 'A+' : avgPct >= 70 ? 'A' : avgPct >= 60 ? 'B+' : avgPct >= 50 ? 'B' : 'C';
    patterns.push({
      type: 'positive',
      title: 'Grade trend',
      description: `Recent assessments average ${avgPct.toFixed(0)}% — around ${predicted}`,
    });
  }

  return patterns;
}
