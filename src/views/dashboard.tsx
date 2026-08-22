'use client';

import { useMemo, useState } from 'react';
import { format, formatDistanceToNow, startOfWeek, isAfter, isBefore, addDays } from 'date-fns';
import {
  ArrowRight,
  BookOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
  UserCheck,
  Timer,
  BrainCircuit,
  ChevronRight,
  Sparkles,
  Flame,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useStore, getSemesterHealth, calculateCGPA, getSubjectAttendance, getSubjectProgress, getStudyTimeThisWeek, getStudyStreak, getStudyTimeToday, getDueRevisionItems, getSubjectSignal } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MetricCard, StatusBadge, InsightCard, SectionHeader, CompactProgress, progressColorClass } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { SignalStatus } from '@/lib/types';

// -- Animation --
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

// -- Health status --
function getHealthConfig(score: number) {
  if (score >= 80) return { label: 'HEALTHY', status: 'healthy' as SignalStatus, description: 'Academics on track' };
  if (score >= 60) return { label: 'GOOD', status: 'improving' as SignalStatus, description: 'Solid progress' };
  if (score >= 40) return { label: 'NEEDS ATTENTION', status: 'attention' as SignalStatus, description: 'Some areas need focus' };
  if (score > 0) return { label: 'CRITICAL', status: 'critical' as SignalStatus, description: 'Immediate action required' };
  return { label: 'NO DATA', status: 'nodata' as SignalStatus, description: 'Add subjects to begin' };
}

function formatStudyTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function signalDotClass(signal: SignalStatus): string {
  const map: Record<SignalStatus, string> = {
    healthy: 'bg-emerald-500', improving: 'bg-blue-500', attention: 'bg-amber-500',
    critical: 'bg-red-500', upcoming: 'bg-purple-500', nodata: 'bg-muted-foreground/40',
  };
  return map[signal];
}

// ════════════════════════════════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════════════════════════════════
// ─── Weekly Heatmap ──────────────────────────────────────────────
function WeeklyHeatmap({ studySessions }: { studySessions: { date: string; duration: number; subjectId: string }[] }) {
  const days = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = studySessions.filter((s) => s.date === dateStr);
      const totalMinutes = Math.floor(daySessions.reduce((sum, s) => sum + s.duration / 60, 0));
      return { date: d, dateStr, label: format(d, 'EEE'), totalMinutes, count: daySessions.length };
    });
  }, [studySessions]);

  const maxMinutes = Math.max(...days.map((d) => d.totalMinutes), 1);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const intensity = Math.min(d.totalMinutes / maxMinutes, 1);
        const isToday = d.dateStr === today;
        const bgOpacity = d.count === 0 ? 0.08 : Math.max(0.15, intensity);
        return (
          <div key={d.dateStr} className="flex flex-col items-center gap-1">
            <div
              className={`w-full aspect-square rounded-md transition-colors ${
                isToday ? 'ring-2 ring-primary/30' : ''
              }`}
              style={{ backgroundColor: `rgba(var(--primary-rgb), ${bgOpacity})` }}
            />
            <span className={`text-[10px] ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{d.label}</span>
            {d.count > 0 && (
              <span className="text-[9px] text-muted-foreground tabular-nums">{d.totalMinutes}m</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const tasks = useStore((s) => s.tasks);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);

  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived), [subjects]);

  // -- Core metrics --
  const healthScore = useMemo(
    () => getSemesterHealth({ subjects, syllabusUnits, assessments, attendance, revisionItems, profile } as never),
    [subjects, syllabusUnits, assessments, attendance, revisionItems, profile]
  );

  const cgpa = useMemo(() => calculateCGPA({ subjects, assessments }), [subjects, assessments]);

  const avgAttendance = useMemo(() => {
    if (activeSubjects.length === 0) return 0;
    const attState = { attendance };
    return Math.round(activeSubjects.reduce((sum, s) => sum + getSubjectAttendance(attState, s.id).percentage, 0) / activeSubjects.length);
  }, [activeSubjects, attendance]);

  const avgSyllabus = useMemo(() => {
    if (activeSubjects.length === 0) return 0;
    const syllState = { syllabusUnits };
    return Math.round(activeSubjects.reduce((sum, s) => sum + getSubjectProgress(syllState, s.id), 0) / activeSubjects.length);
  }, [activeSubjects, syllabusUnits]);

  const studyTimeThisWeek = useMemo(() => getStudyTimeThisWeek({ studySessions }), [studySessions]);

  const studyStreak = useMemo(() => getStudyStreak({ studySessions }), [studySessions]);

  const studyTimeToday = useMemo(() => getStudyTimeToday({ studySessions }), [studySessions]);

  const weeklyGoalHours = profile.weeklyStudyGoalHours || 10;
  const weeklyGoalSeconds = weeklyGoalHours * 3600;
  const weeklyGoalProgress = weeklyGoalSeconds > 0 ? Math.min(100, Math.round((studyTimeThisWeek / weeklyGoalSeconds) * 100)) : 0;
  const weeklyHoursThisWeek = (studyTimeThisWeek / 3600).toFixed(1);

  const dueRevisionCount = useMemo(() => getDueRevisionItems({ revisionItems }).length, [revisionItems]);

  const healthConfig = useMemo(() => getHealthConfig(healthScore), [healthScore]);

  // -- CGPA trend --
  const cgpaTrend = useMemo(() => {
    if (cgpa === 0) return 'neutral' as const;
    if (cgpa >= profile.targetCGPA) return 'up' as const;
    if (cgpa >= profile.targetCGPA - 1) return 'neutral' as const;
    return 'down' as const;
  }, [cgpa, profile.targetCGPA]);

  // -- Subject health data for Academic Flow --
  const subjectHealthData = useMemo(() => {
    return activeSubjects.map((s) => {
      const progress = getSubjectProgress({ syllabusUnits }, s.id);
      const att = getSubjectAttendance({ attendance }, s.id);
      const signal = getSubjectSignal({ attendance, assessments, syllabusUnits, revisionItems, profile, subjects } as any, s.id);
      return { subject: s, progress, att, signal };
    }).sort((a, b) => a.progress - b.progress);
  }, [activeSubjects, syllabusUnits, attendance, assessments, revisionItems, profile, subjects]);

  // -- Recommendations --
  const recommendations = useMemo(() => {
    const items: { title: string; description: string; priority: string; priorityColor: string; actionLabel: string; actionView: string; subjectId?: string; }[] = [];

    // 1. Incomplete syllabus topic with lowest progress
    const syllState = { syllabusUnits };
    const sortedByProgress = activeSubjects.map((s) => ({ subject: s, progress: getSubjectProgress(syllState, s.id) })).sort((a, b) => a.progress - b.progress);

    for (const { subject, progress } of sortedByProgress) {
      if (progress >= 100) continue;
      const units = syllabusUnits.filter((u) => u.subjectId === subject.id);
      const incompleteTopic = units.flatMap((u) => u.topics).find((t) => !t.completed);
      if (incompleteTopic) {
        items.push({
          title: incompleteTopic.name, description: `${subject.name} — ${progress}% complete`,
          priority: 'HIGH IMPACT', priorityColor: 'signal-attention',
          actionLabel: 'STUDY', actionView: 'focus', subjectId: subject.id,
        });
        break;
      }
    }

    // 2. Deadline
    const today = new Date().toISOString().split('T')[0];
    const upcomingExams = exams.filter((e) => e.status === 'upcoming' && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const upcomingAssignments = assignments.filter((a) => a.status !== 'completed' && a.deadline >= today).sort((a, b) => a.deadline.localeCompare(b.deadline));

    const deadlineItem = upcomingExams[0] || upcomingAssignments[0];
    if (deadlineItem) {
      const dateStr = 'date' in deadlineItem ? deadlineItem.date : deadlineItem.deadline;
      const daysUntil = Math.ceil((new Date(dateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      const sub = subjects.find((s) => s.id === deadlineItem.subjectId);
      items.push({
        title: deadlineItem.name || deadlineItem.title, description: `${sub?.name ?? ''} — ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil}d`}`,
        priority: 'DEADLINE', priorityColor: 'signal-critical',
        actionLabel: 'PREPARE', actionView: 'subject-detail', subjectId: deadlineItem.subjectId,
      });
    }

    // 3. Low attendance
    const attState = { attendance };
    const lowestAtt = activeSubjects.map((s) => ({ subject: s, att: getSubjectAttendance(attState, s.id) })).filter((x) => x.att.total > 0).sort((a, b) => a.att.percentage - b.att.percentage)[0];
    if (lowestAtt && lowestAtt.att.percentage < profile.attendanceThreshold) {
      items.push({
        title: `${lowestAtt.subject.name} Attendance`, description: `${lowestAtt.att.percentage}% — need ${profile.attendanceThreshold}%`,
        priority: 'ATTENTION', priorityColor: 'signal-attention',
        actionLabel: 'VIEW', actionView: 'attendance', subjectId: lowestAtt.subject.id,
      });
    }

    return items;
  }, [activeSubjects, syllabusUnits, exams, assignments, subjects, attendance, profile]);

  // -- Upcoming deadlines --
  const upcomingDeadlines = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const items: { title: string; subjectName: string; date: string; type: string; color: string }[] = [];
    exams.filter((e) => e.status === 'upcoming' && e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3).forEach((e) => {
      const sub = subjects.find((s) => s.id === e.subjectId);
      items.push({ title: e.name, subjectName: sub?.name ?? '', date: e.date, type: 'exam', color: sub?.color ?? 'var(--delulu-info)' });
    });
    assignments.filter((a) => a.status !== 'completed' && a.deadline >= today).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3).forEach((a) => {
      const sub = subjects.find((s) => s.id === a.subjectId);
      items.push({ title: a.title, subjectName: sub?.name ?? '', date: a.deadline, type: 'assignment', color: sub?.color ?? 'var(--delulu-warning)' });
    });
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [exams, assignments, subjects]);

  // -- Insights --
  const insights = useMemo(() => {
    const result: { type: 'positive' | 'warning' | 'critical' | 'info'; title: string; description?: string }[] = [];

    // Check subjects at risk
    const atRisk = subjectHealthData.filter((s) => s.signal === 'critical' || s.signal === 'attention');
    if (atRisk.length > 0) {
      result.push({ type: 'warning', title: `${atRisk.length} subject${atRisk.length > 1 ? 's' : ''} need attention`, description: atRisk.map((s) => s.subject.name).join(', ') });
    }

    // Revision queue
    if (dueRevisionCount > 0) {
      result.push({ type: 'info', title: `${dueRevisionCount} revision${dueRevisionCount > 1 ? 's' : ''} due`, description: 'Items in your SM-2 queue are ready for review' });
    }

    // Attendance
    const lowAttSubjects = subjectHealthData.filter((s) => s.att.total > 0 && s.att.percentage < profile.attendanceThreshold);
    if (lowAttSubjects.length > 0) {
      result.push({ type: lowAttSubjects.some((s) => s.att.percentage < profile.attendanceThreshold - 5) ? 'critical' : 'warning', title: 'Attendance below threshold', description: `${lowAttSubjects.map((s) => `${s.subject.name} (${s.att.percentage}%)`).join(', ')}` });
    }

    // Study streak
    const now = new Date();
    const startStr = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
    const weekSessions = studySessions.filter((s) => s.date >= startStr).length;
    if (weekSessions >= 5) {
      result.push({ type: 'positive', title: `${weekSessions} study sessions this week`, description: 'Consistent study pattern detected' });
    } else if (weekSessions === 0) {
      result.push({ type: 'warning', title: 'No study sessions this week', description: 'Start a focus session to build momentum' });
    }

    // CGPA
    if (cgpa > 0 && cgpa >= profile.targetCGPA) {
      result.push({ type: 'positive', title: `CGPA on target`, description: `${cgpa.toFixed(1)} meets your goal of ${profile.targetCGPA}` });
    }

    return result.slice(0, 4);
  }, [subjectHealthData, dueRevisionCount, profile.attendanceThreshold, studySessions, cgpa, profile.targetCGPA]);

  // -- Greeting --
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = format(new Date(), 'EEEE, d MMMM');

  function handleAction(view: string, subjectId?: string) {
    if (subjectId) selectSubject(subjectId);
    navigate(view as never);
  }

  return (
    <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
      {/* ── Header Bar ── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {greeting}, {profile.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5">
            Semester {profile.semester}{profile.branch ? ` · ${profile.branch}` : ''}
          </Badge>
        </div>
      </motion.div>

      {/* ── Academic Health + Metrics Row ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4">
        {/* Health Score */}
        <Card className="hero-card">
          <CardContent className="relative p-5 pt-6 overflow-hidden">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-card/80 pointer-events-none" />
            {/* Decorative accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent pointer-events-none" />
            <div className="relative">
              <span className="section-label">Academic Health</span>
              <div className="mt-3 mb-2">
                <span className="text-5xl font-extrabold tracking-tighter text-foreground leading-none">
                  {healthScore}
                </span>
                <span className="text-lg font-medium text-muted-foreground ml-1">/100</span>
              </div>
              <StatusBadge status={healthConfig.status} label={healthConfig.label} className="mb-2" />
              <p className="text-xs text-muted-foreground mt-1">{healthConfig.description}</p>
              <div className="mt-4">
                <CompactProgress label="Overall" value={healthScore} color={healthScore >= 75 ? 'green' : healthScore >= 50 ? 'blue' : healthScore >= 30 ? 'amber' : 'red'} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Attendance"
              value={`${avgAttendance}%`}
              context={`${activeSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).present, 0)} / ${activeSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).total, 0)} classes`}
              trend={avgAttendance >= profile.attendanceThreshold ? 'up' : 'down'}
              icon={UserCheck}
              valueColor={avgAttendance >= profile.attendanceThreshold ? 'text-[var(--delulu-success)]' : 'text-[var(--delulu-danger)]'}
              onClick={() => navigate('attendance')}
            />
            <MetricCard
              label="Syllabus"
              value={`${avgSyllabus}%`}
              context="Average completion"
              icon={BookOpen}
              onClick={() => navigate('subjects')}
            />
            <MetricCard
              label="CGPA"
              value={cgpa.toFixed(1)}
              context={`Target: ${profile.targetCGPA}`}
              trend={cgpaTrend}
              trendValue={cgpaTrend === 'up' ? 'On target' : cgpaTrend === 'down' ? 'Below' : undefined}
              icon={BarChart3}
              onClick={() => navigate('marks')}
            />
            <MetricCard
              label="Study Time"
              value={formatStudyTime(studyTimeThisWeek)}
              context="This week"
              icon={Clock}
              onClick={() => navigate('analytics')}
            />
          </div>
          {/* Streak + Weekly Goal Row */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Streak"
              value={studyStreak}
              context={`${studyStreak} day streak`}
              icon={Flame}
              iconColor={studyStreak > 0 ? 'text-orange-500' : undefined}
              valueColor={studyStreak > 0 ? 'text-orange-500 dark:text-orange-400' : undefined}
            />
            <div className="metric-card">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="metric-label">Weekly Goal</span>
                <Target className="size-3.5 md:size-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  'text-xl md:text-2xl font-bold tracking-tight leading-none',
                  weeklyGoalProgress >= 100 ? 'text-[var(--delulu-success)]' : 'text-foreground'
                )}>{weeklyHoursThisWeek}h</span>
                <span className="text-xs text-muted-foreground">/ {weeklyGoalHours}h goal</span>
              </div>
              <div className="mt-2">
                <div className="progress-thin">
                  <div
                    className={weeklyGoalProgress >= 100 ? 'bg-emerald-500' : 'bg-primary'}
                    style={{ width: `${Math.min(100, weeklyGoalProgress)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Weekly Activity Heatmap ── */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-4 text-primary" />
                This Week
              </CardTitle>
              <span className="text-[10px] text-muted-foreground font-medium">Study sessions</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <WeeklyHeatmap studySessions={studySessions} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Focus + Recommendations */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="size-4 text-primary" />
                  Today's Focus
                </CardTitle>
                <span className="text-[10px] text-muted-foreground font-medium">{recommendations.length} action{recommendations.length !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2.5 mb-2.5">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No pending actions right now</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="card-interactive flex items-center gap-3 p-3 group"
                      onClick={() => handleAction(rec.actionView, rec.subjectId)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate">{rec.title}</p>
                          <StatusBadge
                            status={rec.priorityColor === 'signal-critical' ? 'critical' : 'attention'}
                            label={rec.priority}
                            className="text-[9px] shrink-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{rec.description}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0 text-xs font-medium text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {rec.actionLabel}
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic Flow */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="size-4 text-primary" />
                  Academic Flow
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('subjects')}>
                  View all <ChevronRight className="size-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {activeSubjects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No subjects added yet</p>
              ) : (
                <div className="space-y-2.5">
                  {subjectHealthData.map(({ subject, progress, att, signal }) => (
                    <div
                      key={subject.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => { selectSubject(subject.id); navigate('subject-detail'); }}
                    >
                      <span className={`status-dot ${signalDotClass(signal)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{subject.name}</span>
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground ml-2">{progress}%</span>
                        </div>
                        <div className="progress-thin">
                          <div
                            className={progress >= 75 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : progress >= 30 ? 'bg-amber-500' : 'bg-red-500'}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">Att: {att.total > 0 ? `${att.percentage}%` : '—'}</span>
                          <span className="text-[10px] text-muted-foreground">{subject.credits} cr</span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signal Legend */}
          {activeSubjects.length > 0 && (
            <div className="signal-legend px-1">
              <div className="signal-legend-item"><span className="status-dot bg-emerald-500" /> On Track</div>
              <div className="signal-legend-item"><span className="status-dot bg-blue-500" /> Improving</div>
              <div className="signal-legend-item"><span className="status-dot bg-amber-500" /> At Risk</div>
              <div className="signal-legend-item"><span className="status-dot bg-red-500" /> Critical</div>
            </div>
          )}
        </motion.div>

        {/* Right Column */}
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Insights */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-[var(--delulu-purple)]" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {insights.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No insights yet</p>
              ) : (
                <div className="space-y-2.5">
                  {insights.map((insight, i) => {
                    const iconMap = { positive: CheckCircle2, warning: AlertTriangle, critical: AlertTriangle, info: Info };
                    const Icon = iconMap[insight.type];
                    return (
                      <div key={i} className={i >= 1 ? 'hidden md:block' : ''}>
                        <InsightCard
                          type={insight.type}
                          icon={Icon}
                          title={insight.title}
                          description={insight.description}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarClock className="size-4 text-[var(--delulu-warning)]" />
                  Deadlines
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('calendar')}>
                  Calendar <ChevronRight className="size-3 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming deadlines</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((d, i) => {
                    const daysUntil = Math.ceil((new Date(d.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(d.type === 'exam' ? 'exams' : 'assignments')}
                      >
                        <div className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{d.title}</p>
                          <p className="text-[10px] text-muted-foreground">{d.subjectName}</p>
                        </div>
                        <Badge
                          variant={daysUntil <= 2 ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tmrw' : `${daysUntil}d`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions — desktop only */}
          <Card className="hidden md:block">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Focus', icon: Timer, view: 'focus' as const },
                  { label: 'Revise', icon: BrainCircuit, view: 'revision' as const },
                  { label: 'Notes', icon: BookOpen, view: 'notes' as const },
                  { label: 'Report', icon: BarChart3, view: 'report' as const },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.view}
                      onClick={() => navigate(a.view)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Icon className="size-3.5" />
                      {a.label}
                    </button>
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
