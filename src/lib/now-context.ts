import { format } from 'date-fns';
import type { Assignment, AttendanceRecord, Exam, Subject, Task, TimetableSlot } from './types';

export type NowContextKind = 'exam' | 'assignment' | 'class' | 'attendance' | 'task';

export interface NowContext {
  kind: NowContextKind;
  /** Lower = more urgent. */
  priority: number;
  title: string;
  subject: string;
  meta: string;
  view: string;
  subjectId?: string | null;
}

export interface NowContextInput {
  timetableSlots: TimetableSlot[];
  exams: Exam[];
  assignments: Assignment[];
  tasks: Task[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  attendanceThreshold: number;
  now?: Date;
}

function pct(records: AttendanceRecord[]): { present: number; total: number; percentage: number } {
  const total = records.reduce((s, r) => s + r.totalClasses, 0);
  const present = records.filter((r) => r.present).reduce((s, r) => s + r.totalClasses, 0);
  return { present, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
}

/**
 * Deterministic "what matters right now" engine.
 * Pure function over existing store data — no duplicated state (see spec §19/§28).
 */
export function buildNowContexts(input: NowContextInput): NowContext[] {
  const now = input.now ?? new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const active = input.subjects.filter((s) => !s.archived && !s.backlog);
  const nameOf = (id?: string) => active.find((s) => s.id === id)?.name ?? '';
  const result: NowContext[] = [];

  // Next class today
  const todaySlots = input.timetableSlots
    .filter((s) => s.day === now.getDay())
    .map((s) => {
      const [h, m] = s.startTime.split(':').map(Number);
      return { slot: s, startMin: (h || 0) * 60 + (m || 0) };
    })
    .filter((x) => x.startMin > nowMinutes)
    .sort((a, b) => a.startMin - b.startMin);
  if (todaySlots.length > 0) {
    const { slot, startMin } = todaySlots[0];
    const minsLeft = startMin - nowMinutes;
    result.push({
      kind: 'class',
      priority: minsLeft <= 60 ? 3 : 5,
      title: nameOf(slot.subjectId) || 'Next class',
      subject: slot.room ? `Room ${slot.room}` : slot.type,
      meta: `${minsLeft} min left · ${slot.startTime}`,
      view: 'timetable',
      subjectId: slot.subjectId,
    });
  }

  // Upcoming exam
  const upcomingExams = input.exams
    .filter((e) => e.status !== 'completed' && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcomingExams.length > 0) {
    const exam = upcomingExams[0];
    const days = Math.ceil(
      (new Date(exam.date + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
    );
    result.push({
      kind: 'exam',
      priority: days <= 2 ? 1 : days <= 7 ? 2 : 6,
      title: exam.name,
      subject: nameOf(exam.subjectId),
      meta: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days · ${format(new Date(exam.date + 'T00:00:00'), 'd MMM')}`,
      view: 'exams',
      subjectId: exam.subjectId,
    });
  }

  // Nearest assignment deadline
  const pending = input.assignments
    .filter((a) => a.status !== 'completed' && a.deadline >= todayStr)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  if (pending.length > 0) {
    const asg = pending[0];
    const days = Math.ceil(
      (new Date(asg.deadline + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
    );
    result.push({
      kind: 'assignment',
      priority: days <= 0 ? 2 : days <= 2 ? 4 : 7,
      title: asg.title,
      subject: nameOf(asg.subjectId),
      meta: days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`,
      view: 'assignments',
      subjectId: asg.subjectId,
    });
  }

  // Attendance attention
  const att = active
    .map((s) => ({ s, a: pct(input.attendance.filter((r) => r.subjectId === s.id)) }))
    .filter((x) => x.a.total > 0 && x.a.percentage < input.attendanceThreshold)
    .sort((a, b) => a.a.percentage - b.a.percentage);
  if (att.length > 0) {
    const worst = att[0];
    result.push({
      kind: 'attendance',
      priority: worst.a.percentage < input.attendanceThreshold - 10 ? 4 : 6,
      title: `${worst.s.name} attendance`,
      subject: `${worst.a.percentage}% · threshold ${input.attendanceThreshold}%`,
      meta: 'Below threshold — plan to attend upcoming classes',
      view: 'attendance',
      subjectId: worst.s.id,
    });
  }

  // Pending tasks
  const open = input.tasks.filter((t) => !t.completed);
  if (open.length > 0) {
    const withDue = open.filter((t) => t.dueDate).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const nearest = withDue[0];
    result.push({
      kind: 'task',
      priority: 8,
      title: nearest ? nearest.title : `${open.length} open tasks`,
      subject: nearest?.subjectId ? nameOf(nearest.subjectId) : '',
      meta: `${open.length} pending${nearest?.dueDate ? ` · next ${format(new Date(nearest.dueDate + 'T00:00:00'), 'd MMM')}` : ''}`,
      view: 'tasks',
      subjectId: nearest?.subjectId,
    });
  }

  return result.sort((a, b) => a.priority - b.priority);
}

export const NOW_KIND_LABEL: Record<NowContextKind, string> = {
  exam: 'Upcoming exam',
  assignment: 'Important deadline',
  class: 'Next class',
  attendance: 'Attendance',
  task: 'Open task',
};
