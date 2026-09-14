'use client';

import { useMemo } from 'react';
import { useStore, getSubjectAttendance } from '@/lib/store';
import { PageHeader, EmptyState } from '@/components/shared';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Clock,
  BookOpen,
  ClipboardList,
  UserCheck,
  CheckSquare,
  CalendarDays,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

type NowContext = {
  kind: 'exam' | 'assignment' | 'class' | 'attendance' | 'task';
  priority: number;
  title: string;
  subject: string;
  meta: string;
  view: string;
  subjectId?: string | null;
};

export default function NowView() {
  const {
    timetableSlots,
    exams,
    assignments,
    tasks,
    subjects,
    attendance,
    profile,
    navigate,
    selectSubject,
  } = useStore();

  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived && !s.backlog),
    [subjects]
  );

  const contexts = useMemo<NowContext[]>(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const result: NowContext[] = [];
    const subjectName = (id?: string) =>
      activeSubjects.find((s) => s.id === id)?.name || '';

    // Next class today (TimetableSlot.day is 0-6, Sunday=0)
    const todaySlots = timetableSlots
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
        title: subjectName(slot.subjectId) || 'Next class',
        subject: slot.room ? `Room ${slot.room}` : slot.type,
        meta: minsLeft <= 0 ? 'Starting now' : `${minsLeft} min left · ${slot.startTime}`,
        view: 'timetable',
        subjectId: slot.subjectId,
      });
    }

    // Upcoming exam (Exam.name, Exam.date)
    const upcomingExams = exams
      .filter((e) => e.status !== 'completed' && e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcomingExams.length > 0) {
      const exam = upcomingExams[0];
      const days = Math.ceil((new Date(exam.date + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000);
      result.push({
        kind: 'exam',
        priority: days <= 2 ? 1 : days <= 7 ? 2 : 6,
        title: exam.name,
        subject: subjectName(exam.subjectId),
        meta: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days · ${format(new Date(exam.date + 'T00:00:00'), 'd MMM')}`,
        view: 'exams',
        subjectId: exam.subjectId,
      });
    }

    // Nearest assignment deadline (Assignment.deadline, status)
    const pendingAssignments = assignments
      .filter((a) => a.status !== 'completed' && a.deadline >= todayStr)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    if (pendingAssignments.length > 0) {
      const asg = pendingAssignments[0];
      const days = Math.ceil((new Date(asg.deadline + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000);
      result.push({
        kind: 'assignment',
        priority: days <= 0 ? 2 : days <= 2 ? 4 : 7,
        title: asg.title,
        subject: subjectName(asg.subjectId),
        meta: days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`,
        view: 'assignments',
        subjectId: asg.subjectId,
      });
    }

    // Attendance: lowest among subjects below threshold
    const attData = activeSubjects
      .map((s) => ({ subject: s, att: getSubjectAttendance({ attendance }, s.id) }))
      .filter((x) => x.att.total > 0 && x.att.percentage < profile.attendanceThreshold)
      .sort((a, b) => a.att.percentage - b.att.percentage);
    if (attData.length > 0) {
      const worst = attData[0];
      result.push({
        kind: 'attendance',
        priority: worst.att.percentage < profile.attendanceThreshold - 10 ? 4 : 6,
        title: `${worst.subject.name} attendance`,
        subject: `${worst.att.percentage}% · threshold ${profile.attendanceThreshold}%`,
        meta: 'Below threshold — plan to attend upcoming classes',
        view: 'attendance',
        subjectId: worst.subject.id,
      });
    }

    // Pending tasks (Task.completed, optional dueDate)
    const openTasks = tasks.filter((t) => !t.completed);
    if (openTasks.length > 0) {
      const withDue = openTasks
        .filter((t) => t.dueDate)
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      const nearest = withDue[0];
      result.push({
        kind: 'task',
        priority: 8,
        title: nearest ? nearest.title : `${openTasks.length} open tasks`,
        subject: nearest?.subjectId ? subjectName(nearest.subjectId) : '',
        meta: `${openTasks.length} pending${nearest?.dueDate ? ` · next ${format(new Date(nearest.dueDate + 'T00:00:00'), 'd MMM')}` : ''}`,
        view: 'tasks',
        subjectId: nearest?.subjectId,
      });
    }

    return result.sort((a, b) => a.priority - b.priority);
  }, [timetableSlots, exams, assignments, tasks, activeSubjects, attendance, profile]);

  const hero = contexts[0];
  const rest = contexts.slice(1, 5);

  const kindIcon = (kind: NowContext['kind']) => {
    switch (kind) {
      case 'exam': return CalendarDays;
      case 'assignment': return ClipboardList;
      case 'class': return Clock;
      case 'attendance': return UserCheck;
      default: return CheckSquare;
    }
  };

  const open = (ctx: NowContext) => {
    if (ctx.subjectId) selectSubject(ctx.subjectId);
    navigate(ctx.view as never);
  };

  const mobileFade = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } };

  return (
    <div className="fab-content-pad space-y-5">
      <PageHeader
        title="Now"
        subtitle="What matters right now"
      />

      {contexts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="All clear"
          description="No upcoming classes, exams, or deadlines in your data yet."
        />
      ) : (
        <>
          {/* Hero — the single most urgent context */}
          {hero && (
            <motion.button
              variants={mobileFade}
              initial="hidden"
              animate="show"
              onClick={() => open(hero)}
              className="w-full text-left rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-card to-card p-5 card-interactive"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {hero.kind === 'exam' ? 'Upcoming exam' : hero.kind === 'assignment' ? 'Important deadline' : hero.kind === 'class' ? 'Next class' : hero.kind === 'attendance' ? 'Attendance' : 'Open task'}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight truncate">{hero.title}</h2>
              {hero.subject && <p className="text-sm text-muted-foreground mt-0.5">{hero.subject}</p>}
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs font-medium text-primary">{hero.meta}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  Open <ChevronRight className="size-3" />
                </span>
              </div>
            </motion.button>
          )}

          {/* Secondary contexts */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rest.map((ctx, i) => {
                const Icon = kindIcon(ctx.kind);
                return (
                  <motion.button
                    key={ctx.kind + i}
                    variants={mobileFade}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.05 * (i + 1) }}
                    onClick={() => open(ctx)}
                    className="text-left rounded-xl border border-border/50 bg-card p-4 card-interactive"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{ctx.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{ctx.meta}</p>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Subject pointer */}
          {hero?.subjectId && (
            <motion.button
              variants={mobileFade}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.3 }}
              onClick={() => open(hero)}
              className="w-full text-left rounded-xl border border-dashed border-border/60 p-3.5 flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="size-4 shrink-0" />
              <span>Open the subject for attendance, marks and syllabus</span>
              <ChevronRight className="size-3.5 ml-auto shrink-0" />
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}
