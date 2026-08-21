'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Timer,
  PlusCircle,
  UserCheck,
  PlusSquare,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  BookOpen,
  BarChart3,
  Clock,
  ClipboardList,
  Target,
  Activity,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import {
  getSemesterHealth,
  calculateCGPA,
  getSubjectAttendance,
  getSubjectProgress,
  getStudyTimeThisWeek,
  getDueRevisionItems,
} from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// -- Health status config ---------------------------------------------
function getHealthStatus(
  score: number
): { label: string; color: string; bg: string } {
  if (score >= 80)
    return { label: 'HEALTHY', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950' };
  if (score >= 60)
    return { label: 'GOOD', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950' };
  if (score >= 40)
    return { label: 'NEEDS ATTENTION', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950' };
  if (score > 0)
    return { label: 'CRITICAL', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950' };
  return { label: 'NO DATA', color: 'text-muted-foreground', bg: 'bg-muted' };
}

// -- Progress bar color -----------------------------------------------
function progressColor(value: number): string {
  if (value >= 75) return '[&>div]:bg-emerald-500';
  if (value >= 50) return '[&>div]:bg-blue-500';
  if (value >= 30) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

function progressLabel(value: number): string {
  if (value >= 75) return 'On track';
  if (value >= 50) return 'Moderate';
  if (value >= 30) return 'Needs work';
  return 'Critical';
}

// -- Format study time (seconds to Xh Ym) -----------------------------
function formatStudyTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// -- Main Component ---------------------------------------------------
export default function DashboardView() {
  const profile = useStore((s) => s.profile);
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const attendance = useStore((s) => s.attendance);
  const assessments = useStore((s) => s.assessments);
  const studySessions = useStore((s) => s.studySessions);
  const revisionItems = useStore((s) => s.revisionItems);
  const exams = useStore((s) => s.exams);
  const assignments = useStore((s) => s.assignments);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);

  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  // -- Computed metrics ------------------------------------------------
  const healthScore = useMemo(
    () =>
      getSemesterHealth({
        subjects,
        syllabusUnits,
        assessments,
        attendance,
        revisionItems,
        profile,
      } as never),
    [subjects, syllabusUnits, assessments, attendance, revisionItems, profile]
  );

  const cgpa = useMemo(
    () => calculateCGPA({ subjects, assessments }),
    [subjects, assessments]
  );

  const avgAttendance = useMemo(() => {
    if (activeSubjects.length === 0) return 0;
    const attState = { attendance };
    const totalPct = activeSubjects.reduce((sum, s) => {
      return sum + getSubjectAttendance(attState, s.id).percentage;
    }, 0);
    return Math.round(totalPct / activeSubjects.length);
  }, [activeSubjects, attendance]);

  const avgSyllabus = useMemo(() => {
    if (activeSubjects.length === 0) return 0;
    const syllState = { syllabusUnits };
    const totalPct = activeSubjects.reduce((sum, s) => {
      return sum + getSubjectProgress(syllState, s.id);
    }, 0);
    return Math.round(totalPct / activeSubjects.length);
  }, [activeSubjects, syllabusUnits]);

  const studyTimeThisWeek = useMemo(
    () => getStudyTimeThisWeek({ studySessions }),
    [studySessions]
  );

  const healthStatus = useMemo(
    () => getHealthStatus(healthScore),
    [healthScore]
  );

  // -- Today's Focus recommendations -----------------------------------
  const recommendations = useMemo(() => {
    const items: {
      number: string;
      title: string;
      description: string;
      priority: string;
      priorityColor: string;
      actionLabel: string;
      actionView: string;
      subjectId?: string;
    }[] = [];

    // 1. Incomplete syllabus topic with the lowest completion subject
    const syllState = { syllabusUnits };
    const subjectProgressMap = activeSubjects.map((s) => ({
      subject: s,
      progress: getSubjectProgress(syllState, s.id),
    }));
    const sortedByProgress = [...subjectProgressMap].sort(
      (a, b) => a.progress - b.progress
    );

    for (const { subject, progress } of sortedByProgress) {
      if (progress >= 100) continue;
      const units = syllabusUnits.filter((u) => u.subjectId === subject.id);
      const incompleteTopic = units
        .flatMap((u) => u.topics)
        .find((t) => !t.completed);
      if (incompleteTopic) {
        items.push({
          number: '01',
          title: incompleteTopic.name,
          description: `${subject.name} - ${progress}% syllabus complete`,
          priority: 'HIGH IMPACT',
          priorityColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400',
          actionLabel: 'START',
          actionView: 'focus',
          subjectId: subject.id,
        });
        break;
      }
    }

    // 2. Upcoming exam/assignment due soonest
    const today = new Date().toISOString().split('T')[0];
    const upcomingExams = exams
      .filter((e) => e.status === 'upcoming' && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const upcomingAssignments = assignments
      .filter((a) => a.status !== 'completed' && a.deadline >= today)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));

    const soonestExam = upcomingExams[0];
    const soonestAssignment = upcomingAssignments[0];

    let deadlineItem: { title: string; date: string; subjectId: string } | null = null;
    if (soonestExam && soonestAssignment) {
      deadlineItem =
        soonestExam.date <= soonestAssignment.deadline
          ? { title: soonestExam.name, date: soonestExam.date, subjectId: soonestExam.subjectId }
          : { title: soonestAssignment.title, date: soonestAssignment.deadline, subjectId: soonestAssignment.subjectId };
    } else if (soonestExam) {
      deadlineItem = { title: soonestExam.name, date: soonestExam.date, subjectId: soonestExam.subjectId };
    } else if (soonestAssignment) {
      deadlineItem = { title: soonestAssignment.title, date: soonestAssignment.deadline, subjectId: soonestAssignment.subjectId };
    }

    if (deadlineItem) {
      const daysUntil = Math.ceil(
        (new Date(deadlineItem.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      );
      const deadlineSubject = subjects.find((s) => s.id === deadlineItem.subjectId);
      items.push({
        number: '02',
        title: deadlineItem.title,
        description: `${deadlineSubject?.name ?? ''} - ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}`,
        priority: 'DEADLINE',
        priorityColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
        actionLabel: 'PREPARE',
        actionView: 'subject-detail',
        subjectId: deadlineItem.subjectId,
      });
    }

    // 3. Subject with lowest attendance
    const attState = { attendance };
    const subjectAttMap = activeSubjects
      .map((s) => ({
        subject: s,
        att: getSubjectAttendance(attState, s.id),
      }))
      .filter((x) => x.att.total > 0)
      .sort((a, b) => a.att.percentage - b.att.percentage);

    const lowestAtt = subjectAttMap[0];
    if (lowestAtt && lowestAtt.att.percentage < profile.attendanceThreshold) {
      items.push({
        number: '03',
        title: `${lowestAtt.subject.name} Attendance`,
        description: `Currently at ${lowestAtt.att.percentage}% - threshold is ${profile.attendanceThreshold}%`,
        priority: 'ATTENTION',
        priorityColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400',
        actionLabel: 'VIEW',
        actionView: 'attendance',
        subjectId: lowestAtt.subject.id,
      });
    }

    return items;
  }, [activeSubjects, syllabusUnits, exams, assignments, subjects, attendance, profile.attendanceThreshold]);

  // -- Academic Pulse metrics -----------------------------------------
  const pulseMetrics = useMemo(() => {
    const syllPct = avgSyllabus;
    const attPct = avgAttendance;

    // Study Consistency: sessions this week / 7
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    const startStr = startOfWeek.toISOString().split('T')[0];
    const sessionsThisWeek = studySessions.filter((s) => s.date >= startStr).length;
    const consistencyPct = Math.min(100, Math.round((sessionsThisWeek / 7) * 100));

    // Revision Queue: due items count
    const dueCount = getDueRevisionItems({ revisionItems }).length;
    const maxRevision = Math.max(revisionItems.length, 1);
    const revisionPct = revisionItems.length > 0
      ? Math.round(((revisionItems.length - dueCount) / maxRevision) * 100)
      : 100;

    // CA Performance: avg assessment score
    const caPct =
      assessments.length > 0
        ? Math.round(
            assessments.reduce((sum, a) => sum + (a.obtainedMarks / a.maxMarks) * 100, 0) /
              assessments.length
          )
        : 0;

    return [
      { label: 'Syllabus Progress', value: syllPct, display: `${syllPct}%` },
      { label: 'Attendance Health', value: attPct, display: `${attPct}%` },
      { label: 'Study Consistency', value: consistencyPct, display: `${sessionsThisWeek}/7 days` },
      { label: 'Revision Queue', value: revisionPct, display: `${dueCount} due` },
      { label: 'CA Performance', value: caPct, display: `${caPct}%` },
    ];
  }, [avgSyllabus, avgAttendance, studySessions, revisionItems, assessments]);

  // -- Greeting logic -------------------------------------------------
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = format(new Date(), 'EEEE, d MMMM yyyy');

  // -- CGPA trend (compare to target) ---------------------------------
  const cgpaTrend = useMemo(() => {
    if (cgpa === 0) return 'neutral' as const;
    if (cgpa >= profile.targetCGPA) return 'up' as const;
    if (cgpa >= profile.targetCGPA - 1) return 'neutral' as const;
    return 'down' as const;
  }, [cgpa, profile.targetCGPA]);

  // -- Quick actions --------------------------------------------------
  const quickActions = [
    { label: 'Start Focus', icon: Timer, view: 'focus' as const },
    { label: 'Add Assessment', icon: PlusCircle, view: 'marks' as const },
    { label: 'Mark Attendance', icon: UserCheck, view: 'attendance' as const },
    { label: 'Add Task', icon: PlusSquare, view: 'tasks' as const },
    { label: 'View Report', icon: FileText, view: 'report' as const },
  ];

  // -- Handlers -------------------------------------------------------
  function handleAction(view: string, subjectId?: string) {
    if (subjectId) selectSubject(subjectId);
    navigate(view as never);
  }

  return (
    <motion.div
      className="space-y-8 scroll-mt-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* 1. GREETING SECTION */}
      <motion.div variants={fadeUp}>
        <div className="border-b-2 border-primary/20 pb-4 mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {greeting}, {profile.name}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {formattedDate}
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs font-medium tracking-wide uppercase">
            Semester {profile.semester}
            {profile.branch ? ` - ${profile.branch}` : ''}
          </Badge>
        </div>
      </motion.div>

      {/* 2. SEMESTER HEALTH CARD */}
      <motion.div variants={fadeUp}>
        <Card className="card-hover lg:col-span-3">
          <CardContent className="p-6">
            {/* Main score + status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-baseline gap-4">
                <span
                  className="gradient-text font-bold tracking-tighter leading-none"
                  style={{ fontSize: '48px' }}
                >
                  {healthScore}
                </span>
                <span className="text-2xl font-medium text-muted-foreground">/ 100</span>
              </div>
              <Badge
                className={`${healthStatus.bg} ${healthStatus.color} border-0 px-3 py-1 text-xs font-bold tracking-wider`}
              >
                {healthStatus.label}
              </Badge>
            </div>

            {/* Supporting metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* CGPA */}
              <div className="card-hover transition-all duration-200 rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CGPA
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{cgpa.toFixed(1)}</span>
                  {cgpaTrend === 'up' && (
                    <TrendingUp className="size-4 text-emerald-500" />
                  )}
                  {cgpaTrend === 'down' && (
                    <TrendingDown className="size-4 text-red-500" />
                  )}
                  {cgpaTrend === 'neutral' && (
                    <Minus className="size-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {profile.targetCGPA}
                </p>
              </div>

              {/* Attendance */}
              <div className="card-hover transition-all duration-200 rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Attendance
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${avgAttendance >= profile.attendanceThreshold ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {avgAttendance}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Threshold: {profile.attendanceThreshold}%
                </p>
              </div>

              {/* Syllabus */}
              <div className="card-hover transition-all duration-200 rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Syllabus
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{avgSyllabus}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg completion
                </p>
              </div>

              {/* Study Time */}
              <div className="card-hover transition-all duration-200 rounded-lg border border-border bg-background/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Study Time
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatStudyTime(studyTimeThisWeek)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 3. TODAY'S FOCUS */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                {`Today's Focus`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <ClipboardList className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All caught up! No pending recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.number}
                      className="card-hover group flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                    >
                      <span className="text-xs font-bold text-muted-foreground/60 pt-1 min-w-[24px]">
                        {rec.number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold truncate">
                            {rec.title}
                          </h4>
                          <Badge
                            className={`${rec.priorityColor} border-0 px-2 py-0.5 text-[10px] font-bold tracking-wider`}
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {rec.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 text-xs font-semibold tracking-wide"
                        onClick={() => handleAction(rec.actionView, rec.subjectId)}
                      >
                        {rec.actionLabel}
                        <ArrowRight className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. ACADEMIC PULSE */}
        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5" />
                Academic Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-5">
                {pulseMetrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {metric.label}
                      </span>
                      <span className="text-xs font-semibold">
                        {metric.display}
                      </span>
                    </div>
                    <Progress
                      value={metric.value}
                      className={`h-2.5 transition-all duration-500 ${progressColor(metric.value)}`}
                    />
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {progressLabel(metric.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 5. QUICK ACTIONS */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.view}
                      variant="ghost"
                      className="group card-hover h-auto flex-col gap-2.5 py-5 px-3 hover:bg-accent transition-colors"
                      onClick={() => navigate(action.view)}
                    >
                      <Icon className="size-5 group-hover:text-primary transition-colors" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
