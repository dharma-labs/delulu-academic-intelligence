'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import {
  ArrowRight,
  BookOpen,
  Clock,
  TrendingUp,
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
  Zap,
  StickyNote,
  Bot,
  Trophy,
  Settings2,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useStore, getSemesterHealth, calculateCGPA, getSubjectAttendance, getSubjectProgress, getStudyTimeThisWeek, getStudyStreak, getStudyTimeToday, getDueRevisionItems, getSubjectSignal } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricCard, StatusBadge, InsightCard, SectionHeader, CompactProgress, EmptyState, progressColorClass } from '@/components/shared';
import { useToast } from '@/components/toast';
import { QuickNoteDialog } from '@/components/quick-note-dialog';
import { AchievementsDialog } from '@/components/achievements-dialog';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { SignalStatus } from '@/lib/types';

// -- Widget customization --
const DESKTOP_WIDGETS = [
  { id: 'weekly-activity', label: 'Weekly Activity' },
  { id: 'todays-focus', label: "Today's Focus" },
  { id: 'academic-flow', label: 'Academic Flow' },
  { id: 'study-patterns', label: 'Study Patterns' },
  { id: 'insights', label: 'Insights' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'quick-actions', label: 'Quick Actions' },
] as const;

const MOBILE_WIDGETS = [
  { id: 'subject-progress', label: 'Subject Progress' },
  { id: 'weekly-goal', label: 'Weekly Goal' },
  { id: 'study-sparkline', label: 'Study Sparkline' },
  { id: 'quick-actions', label: 'Quick Actions' },
  { id: 'insight', label: 'Insight' },
] as const;

function useHiddenWidgets(): [string[], (id: string) => void] {
  const [hidden, setHidden] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('dashboard-hidden-widgets');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem('dashboard-hidden-widgets', JSON.stringify(hidden));
  }, [hidden]);
  const toggle = (id: string) => {
    setHidden((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  return [hidden, toggle];
}

// -- Animation --
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };
const mobileFade = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } } };

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

// -- Health Ring Component (Mobile) --
function HealthRing({ score, config }: { score: number; config: ReturnType<typeof getHealthConfig> }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = score >= 75 ? 'var(--delulu-success)' : score >= 50 ? 'var(--delulu-info)' : score >= 30 ? 'var(--delulu-warning)' : 'var(--delulu-danger)';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="5" opacity="0.3" />
        <circle
          cx="56" cy="56" r={radius} fill="none" stroke={strokeColor} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="text-3xl font-extrabold tracking-tighter leading-none">{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// -- Weekly Mini Chart (mobile sparkline) --
function WeeklyMiniChart({ studySessions }: { studySessions: { date: string; duration: number }[] }) {
  const bars = useMemo(() => {
    const days: { label: string; minutes: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMinutes = Math.floor(studySessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + s.duration / 60, 0));
      days.push({
        label: format(d, 'EEE').charAt(0),
        minutes: dayMinutes,
        isToday: i === 0,
      });
    }
    return days;
  }, [studySessions]);

  const maxMin = Math.max(...bars.map(b => b.minutes), 1);

  return (
    <div className="flex items-end gap-1.5 h-12">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative" style={{ height: '32px' }}>
            <div
              className={cn(
                'absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 rounded-t-sm transition-all duration-500',
                b.isToday ? 'bg-primary' : 'bg-primary/25',
              )}
              style={{ height: `${Math.max(4, (b.minutes / maxMin) * 100)}%` }}
            />
          </div>
          <span className={cn('text-[8px] tabular-nums', b.isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
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
              className={cn('w-full aspect-square rounded-md transition-colors', isToday && 'ring-2 ring-primary/30', d.count === 0 && 'chart-empty-cell')}
              style={d.count > 0 ? { backgroundColor: `rgba(var(--primary-rgb), ${bgOpacity})` } : undefined}
            />
            <span className={cn('text-[10px]', isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{d.label}</span>
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

  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [hiddenWidgets, toggleWidget] = useHiddenWidgets();

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

  // -- Streak milestone toast --
  const { toast } = useToast();
  const milestoneToastRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const milestones = [3, 7, 14, 21, 30, 60, 90];
    const met = milestones.filter((m) => studyStreak >= m);

    // First run: seed ref with already-reached milestones (no toast)
    if (milestoneToastRef.current === null) {
      milestoneToastRef.current = new Set(met);
      if (studyStreak >= 100) milestoneToastRef.current.add(100);
      return;
    }

    const titleMap: Record<number, string> = {
      3: '3-day streak started!',
      7: 'One week streak!',
      14: 'Two weeks strong!',
      21: 'Three week streak!',
      30: 'Monthly milestone!',
      60: 'Two months of consistency!',
      90: 'Quarter-year streak!',
    };

    // Check each milestone
    for (const m of met) {
      if (!milestoneToastRef.current.has(m)) {
        milestoneToastRef.current.add(m);
        toast({
          variant: 'success',
          title: titleMap[m] ?? `Incredible ${m}-day streak!`,
          description: 'Keep up the amazing work! Your consistent study habits are paying off.',
        });
      }
    }

    // 100+ milestone
    if (studyStreak >= 100 && !milestoneToastRef.current.has(100)) {
      milestoneToastRef.current.add(100);
      toast({
        variant: 'success',
        title: `Incredible ${studyStreak}-day streak!`,
        description: 'Keep up the amazing work! Your consistent study habits are paying off.',
      });
    }
  }, [studyStreak, toast]);

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

    const atRisk = subjectHealthData.filter((s) => s.signal === 'critical' || s.signal === 'attention');
    if (atRisk.length > 0) {
      result.push({ type: 'warning', title: `${atRisk.length} subject${atRisk.length > 1 ? 's' : ''} need attention`, description: atRisk.map((s) => s.subject.name).join(', ') });
    }

    if (dueRevisionCount > 0) {
      result.push({ type: 'info', title: `${dueRevisionCount} revision${dueRevisionCount > 1 ? 's' : ''} due`, description: 'Items in your SM-2 queue are ready for review' });
    }

    const lowAttSubjects = subjectHealthData.filter((s) => s.att.total > 0 && s.att.percentage < profile.attendanceThreshold);
    if (lowAttSubjects.length > 0) {
      result.push({ type: lowAttSubjects.some((s) => s.att.percentage < profile.attendanceThreshold - 5) ? 'critical' : 'warning', title: 'Attendance below threshold', description: `${lowAttSubjects.map((s) => `${s.subject.name} (${s.att.percentage}%)`).join(', ')}` });
    }

    const now = new Date();
    const startStr = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
    const weekSessions = studySessions.filter((s) => s.date >= startStr).length;
    if (weekSessions >= 5) {
      result.push({ type: 'positive', title: `${weekSessions} study sessions this week`, description: 'Consistent study pattern detected' });
    } else if (weekSessions === 0) {
      result.push({ type: 'warning', title: 'No study sessions this week', description: 'Start a focus session to build momentum' });
    }

    if (cgpa > 0 && cgpa >= profile.targetCGPA) {
      result.push({ type: 'positive', title: `CGPA on target`, description: `${cgpa.toFixed(1)} meets your goal of ${profile.targetCGPA}` });
    }

    return result.slice(0, 4);
  }, [subjectHealthData, dueRevisionCount, profile.attendanceThreshold, studySessions, cgpa, profile.targetCGPA]);

  // -- Study Pattern Insights --
  const studyPatterns = useMemo(() => {
    const patterns: { type: 'positive' | 'warning' | 'info'; title: string; description: string }[] = [];
    const today = new Date().toISOString().split('T')[0];
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0];
    const weekSessions = studySessions.filter((s) => s.date >= ws);
    const todaySessions = studySessions.filter((s) => s.date === today);
    const totalWeekSec = weekSessions.reduce((a, s) => a + s.duration, 0);
    const avgSessionMin = weekSessions.length > 0 ? Math.round(totalWeekSec / weekSessions.length / 60) : 0;

    // Best day
    const dayTotals: Record<string, number> = {};
    weekSessions.forEach((s) => { dayTotals[s.date] = (dayTotals[s.date] || 0) + s.duration; });
    const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) {
      const dayName = format(new Date(bestDay[0] + 'T12:00:00'), 'EEEE');
      patterns.push({ type: 'info', title: `Most productive: ${dayName}`, description: `${Math.round(bestDay[1] / 60)}m total study time` });
    }

    // Session length analysis
    if (avgSessionMin > 0 && avgSessionMin < 25) {
      patterns.push({ type: 'warning', title: 'Short sessions detected', description: `Average ${avgSessionMin}m — try 25+ min Pomodoro sessions for deeper focus` });
    } else if (avgSessionMin >= 45) {
      patterns.push({ type: 'positive', title: 'Great session length', description: `Average ${avgSessionMin}m — solid deep work sessions` });
    }

    // Subject coverage
    const coveredSubjects = new Set(weekSessions.map((s) => s.subjectId)).size;
    if (coveredSubjects > 0 && coveredSubjects < activeSubjects.length) {
      const uncovered = activeSubjects.filter((s) => !weekSessions.some((ws) => ws.subjectId === s.id));
      patterns.push({ type: 'info', title: `${uncovered.length} subject${uncovered.length > 1 ? 's' : ''} not studied this week`, description: uncovered.map((s) => s.name).join(', ') });
    }

    // Grade prediction
    if (assessments.length >= 2) {
      const recent = [...assessments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
      const avgPct = recent.reduce((a, x) => a + (x.obtainedMarks / x.maxMarks) * 100, 0) / recent.length;
      const predictedGrade = avgPct >= 90 ? 'O' : avgPct >= 80 ? 'A+' : avgPct >= 70 ? 'A' : avgPct >= 60 ? 'B+' : avgPct >= 50 ? 'B' : 'C';
      patterns.push({ type: 'positive', title: 'Grade trend prediction', description: `Based on recent assessments: ${predictedGrade} (${avgPct.toFixed(0)}% average)` });
    }

    return patterns;
  }, [studySessions, assessments, activeSubjects]);

  // -- Weekly Study Distribution (per subject) --
  const weeklyDistribution = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    const weekSessions = studySessions.filter((s) => s.date >= cutoff);
    const subjectMinutes: Record<string, number> = {};

    for (const s of weekSessions) {
      subjectMinutes[s.subjectId] = (subjectMinutes[s.subjectId] || 0) + s.duration / 60;
    }

    return Object.entries(subjectMinutes)
      .map(([subjectId, minutes]) => {
        const subject = subjects.find((s) => s.id === subjectId);
        return subject ? { subjectId: subject.id, name: subject.name, color: subject.color, minutes: Math.round(minutes) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.minutes - a.minutes);
  }, [studySessions, subjects]);

  // -- 7-day sparkline data for desktop metric cards --
  const studySparkline = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMin = Math.floor(studySessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + s.duration / 60, 0));
      data.push(dayMin);
    }
    return data;
  }, [studySessions]);

  // Attendance sparkline: 7-day attendance % per day
  const attendanceSparkline = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRecords = attendance.filter(a => a.date === dateStr);
      if (dayRecords.length === 0) {
        data.push(0);
      } else {
        const total = dayRecords.reduce((s, r) => s + r.totalClasses, 0);
        const present = dayRecords.filter(r => r.present).reduce((s, r) => s + r.totalClasses, 0);
        data.push(total > 0 ? Math.round((present / total) * 100) : 0);
      }
    }
    return data;
  }, [attendance]);

  // Syllabus sparkline: cumulative completion % per day over last 7 days
  const syllabusSparkline = useMemo(() => {
    const data: number[] = [];
    // Check if any topics have completion tracking with dates
    const hasCompletionDates = syllabusUnits.some(u =>
      u.topics.some(t => t.completed && ('completedAt' in t))
    );
    if (hasCompletionDates) {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        // Count topics completed by this date
        let totalTopics = 0;
        let completedByDate = 0;
        for (const unit of syllabusUnits) {
          for (const topic of unit.topics) {
            totalTopics++;
            if (topic.completed) {
              const cDate = (topic as Record<string, unknown>).completedAt as string | undefined;
              if (cDate && cDate <= dateStr) {
                completedByDate++;
              }
            }
          }
        }
        data.push(totalTopics > 0 ? Math.round((completedByDate / totalTopics) * 100) : 0);
      }
    } else {
      // No completion dates — show current average repeated 7 times
      return Array(7).fill(avgSyllabus);
    }
    return data;
  }, [syllabusUnits, avgSyllabus]);

  // CGPA sparkline: last 7 assessment scores as percentages, or CGPA*10 repeated
  const cgpaSparkline = useMemo(() => {
    if (assessments.length > 0) {
      const recent = [...assessments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7)
        .reverse()
        .map(a => Math.round((a.obtainedMarks / a.maxMarks) * 100));
      return recent;
    }
    return Array(7).fill(Math.round(cgpa * 10));
  }, [assessments, cgpa]);

  // -- Greeting --
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDate = format(new Date(), 'EEEE, d MMMM');

  function handleAction(view: string, subjectId?: string) {
    if (subjectId) selectSubject(subjectId);
    navigate(view as never);
  }

  // -- Mobile micro-metrics --
  const microMetrics = useMemo(() => [
    { label: 'Att', value: `${avgAttendance}%`, color: avgAttendance >= profile.attendanceThreshold ? 'text-[var(--delulu-success)]' : avgAttendance >= profile.attendanceThreshold - 10 ? 'text-[var(--delulu-warning)]' : 'text-[var(--delulu-danger)]', view: 'attendance' as const },
    { label: 'CGPA', value: cgpa.toFixed(1), color: cgpaTrend === 'up' ? 'text-[var(--delulu-success)]' : cgpaTrend === 'down' ? 'text-[var(--delulu-danger)]' : 'text-foreground', view: 'marks' as const },
    { label: 'Syllabus', value: `${avgSyllabus}%`, color: 'text-foreground', view: 'subjects' as const },
    { label: 'Streak', value: `${studyStreak}d`, color: studyStreak > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground', view: 'analytics' as const },
    { label: 'Week', value: `${weeklyHoursThisWeek}h`, color: weeklyGoalProgress >= 100 ? 'text-[var(--delulu-success)]' : 'text-foreground', view: 'analytics' as const },
    { label: 'Revision', value: `${dueRevisionCount}`, color: dueRevisionCount > 3 ? 'text-[var(--delulu-danger)]' : 'text-foreground', view: 'revision' as const },
  ], [avgAttendance, profile.attendanceThreshold, cgpa, cgpaTrend, avgSyllabus, studyStreak, weeklyHoursThisWeek, weeklyGoalProgress, dueRevisionCount]);

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          MOBILE DASHBOARD — Intentionally minimal, action-oriented
          ══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-4 fab-content-pad">
        {/* Health Ring + Status */}
        <motion.div variants={mobileFade} initial="hidden" animate="show" className="flex items-center gap-5">
          <HealthRing score={healthScore} config={healthConfig} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-muted-foreground">{greeting}, <span className="text-foreground font-medium">{profile.name}</span></p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                    <Settings2 className="size-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-3">
                  <p className="section-label mb-2">Customize Dashboard</p>
                  <div className="space-y-1.5">
                    {MOBILE_WIDGETS.map((w) => (
                      <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={!hiddenWidgets.includes(w.id)}
                          onCheckedChange={() => toggleWidget(w.id)}
                        />
                        <span className="text-sm">{w.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <StatusBadge status={healthConfig.status} label={healthConfig.label} className="mb-1.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{healthConfig.description}</p>
          </div>
        </motion.div>

        {/* Micro-Metrics Strip — Horizontal Scroll */}
        <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            {microMetrics.map((m) => (
              <button
                key={m.label}
                onClick={() => navigate(m.view)}
                className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-card border border-border/50 min-w-[60px] active:scale-95 transition-transform"
              >
                <span className={cn('text-base font-bold tracking-tight leading-none tabular-nums', m.color)}>{m.value}</span>
                <span className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase">{m.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Top Recommendation Card */}
        {recommendations.length > 0 && (
          <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
            <div
              className="card-interactive p-3.5 flex items-center gap-3 border-l-[3px] border-l-primary"
              onClick={() => handleAction(recommendations[0].actionView, recommendations[0].subjectId)}
            >
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mb-0.5">Focus now</p>
                <p className="text-sm font-medium truncate">{recommendations[0].title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{recommendations[0].description}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0" />
            </div>
          </motion.div>
        )}

        {/* Compact Subject Flow */}
        {!hiddenWidgets.includes('subject-progress') && (
        <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="section-label">Subject Progress</span>
            <button onClick={() => navigate('subjects')} className="text-[10px] text-primary font-medium px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-primary/5 active:bg-primary/10 transition-colors">View all</button>
          </div>
          <div className="space-y-2">
            {subjectHealthData.slice(0, 4).map(({ subject, progress, signal }) => (
              <div
                key={subject.id}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/40 active:bg-accent/50 transition-colors"
                onClick={() => { selectSubject(subject.id); navigate('subject-detail'); }}
              >
                <span className={cn('status-dot shrink-0', signalDotClass(signal))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{subject.name}</span>
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground ml-1.5">{progress}%</span>
                  </div>
                  <div className="progress-thin progress-animate">
                    <div
                      className={progress >= 75 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : progress >= 30 ? 'bg-amber-500' : 'bg-red-500'}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
        )}

        {/* Weekly Goal Mini Bar */}
        {!hiddenWidgets.includes('weekly-goal') && (
        <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="size-3.5 text-primary" />
              <span className="text-xs font-medium">Weekly Goal</span>
            </div>
            <span className={cn('text-xs font-bold tabular-nums', weeklyGoalProgress >= 100 ? 'text-[var(--delulu-success)]' : 'text-foreground')}>
              {weeklyHoursThisWeek}h / {weeklyGoalHours}h
            </span>
          </div>
          <div className="progress-thin progress-animate">
            <div className={weeklyGoalProgress >= 100 ? 'bg-emerald-500' : 'bg-primary'} style={{ width: `${Math.min(100, weeklyGoalProgress)}%` }} />
          </div>
        </motion.div>
        )}

        {!hiddenWidgets.includes('study-sparkline') && (
        <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.22 }} className="metric-card">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-3.5 text-primary" />
              <span className="text-xs font-medium">Study This Week</span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{weeklyHoursThisWeek}h total</span>
          </div>
          <WeeklyMiniChart studySessions={studySessions} />
        </motion.div>
        )}

        {/* Quick Actions */}
        {!hiddenWidgets.includes('quick-actions') && (
        <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.25 }}>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Focus', icon: Timer, view: 'focus' as const, color: 'bg-blue-500/10 text-blue-500 dark:text-blue-400' },
              { label: 'Revise', icon: BrainCircuit, view: 'revision' as const, color: 'bg-purple-500/10 text-purple-500 dark:text-purple-400' },
              { label: 'Notes', icon: StickyNote, view: 'notes' as const, color: 'bg-amber-500/10 text-amber-500 dark:text-amber-400' },
              { label: 'AI Tutor', icon: Bot, view: 'ai-tutor' as const, color: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' },
              { label: 'Achieve', icon: Trophy, action: true, color: 'bg-amber-500/10 text-amber-500 dark:text-amber-400' },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={'view' in a ? a.view : 'achievements'}
                  onClick={() => 'view' in a ? navigate(a.view as import('@/lib/types').ViewId) : setAchievementsOpen(true)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card border border-border/40 active:scale-95 transition-transform"
                >
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', a.color)}>
                    <Icon className="size-4" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
        )}

        {/* First Insight Only */}
        {!hiddenWidgets.includes('insight') && insights.length > 0 && (
          <motion.div variants={mobileFade} initial="hidden" animate="show" transition={{ delay: 0.3 }}>
            <InsightCard type={insights[0].type} icon={insights[0].type === 'positive' ? CheckCircle2 : insights[0].type === 'critical' ? AlertTriangle : Sparkles} title={insights[0].title} description={insights[0].description} />
          </motion.div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP DASHBOARD — Information-rich analytical workspace
          ══════════════════════════════════════════════════════════════ */}
      <motion.div className="hidden md:block space-y-5" variants={container} initial="hidden" animate="show">
        {/* ── Header Bar ── */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {greeting}, {profile.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-auto px-1.5 text-xs text-muted-foreground">
                  <Settings2 className="size-3 mr-1" />
                  Customize
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-3">
                <p className="section-label mb-2">Customize Dashboard</p>
                <div className="space-y-1.5">
                  {DESKTOP_WIDGETS.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={!hiddenWidgets.includes(w.id)}
                        onCheckedChange={() => toggleWidget(w.id)}
                      />
                      <span className="text-sm">{w.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
              <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-card/80 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent pointer-events-none" />
              <div className="relative">
                <span className="section-label">Academic Health</span>
                <div className="mt-3 mb-2">
                  <span className="text-5xl font-extrabold tracking-tighter leading-none text-gradient">
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Attendance"
                value={`${avgAttendance}%`}
                context={`${activeSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).present, 0)} / ${activeSubjects.reduce((s, sub) => s + getSubjectAttendance({ attendance }, sub.id).total, 0)} classes`}
                trend={avgAttendance >= profile.attendanceThreshold ? 'up' : avgAttendance >= profile.attendanceThreshold - 10 ? 'neutral' : 'down'}
                icon={UserCheck}
                valueColor={avgAttendance >= profile.attendanceThreshold ? 'text-[var(--delulu-success)]' : avgAttendance >= profile.attendanceThreshold - 10 ? 'text-[var(--delulu-warning)]' : 'text-[var(--delulu-danger)]'}
                sparkline={attendanceSparkline}
                sparklineColor="#10B981"
                onClick={() => navigate('attendance')}
              />
              <MetricCard
                label="Syllabus"
                value={`${avgSyllabus}%`}
                context="Average completion"
                icon={BookOpen}
                sparkline={syllabusSparkline}
                sparklineColor="#3B82F6"
                onClick={() => navigate('subjects')}
              />
              <MetricCard
                label="CGPA"
                value={cgpa.toFixed(1)}
                context={`Target: ${profile.targetCGPA}`}
                trend={cgpaTrend}
                trendValue={cgpaTrend === 'up' ? 'On target' : cgpaTrend === 'down' ? 'Below' : undefined}
                icon={BarChart3}
                sparkline={cgpaSparkline}
                sparklineColor={cgpaTrend === 'up' ? '#10B981' : cgpaTrend === 'down' ? '#EF4444' : '#64748B'}
                onClick={() => navigate('marks')}
              />
              <MetricCard
                label="Study Time"
                value={formatStudyTime(studyTimeThisWeek)}
                context="This week"
                icon={Clock}
                sparkline={studySparkline}
                onClick={() => navigate('analytics')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Streak"
                value={studyStreak}
                context={`${studyStreak} day streak`}
                icon={Flame}
                iconColor={studyStreak > 0 ? 'text-orange-500' : undefined}
                valueColor={studyStreak > 0 ? 'text-orange-500 dark:text-orange-400' : undefined}
                className={studyStreak >= 7 ? 'streak-glow' : undefined}
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
                  <div className="progress-thin progress-animate">
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
        {!hiddenWidgets.includes('weekly-activity') && (
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
        )}

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's Focus + Recommendations */}
          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
            {!hiddenWidgets.includes('todays-focus') && (
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
            )}

            {/* Academic Flow */}
            {!hiddenWidgets.includes('academic-flow') && (
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
                        <span className={cn('status-dot', signalDotClass(signal))} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{subject.name}</span>
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground ml-2">{progress}%</span>
                          </div>
                          <div className="progress-thin progress-animate">
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
            )}

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
            {/* Study Pattern Insights */}
            {!hiddenWidgets.includes('study-patterns') && studyPatterns.length > 0 && (
              <Card>
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-[var(--delulu-purple)]" />
                    Study Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="space-y-2.5">
                    {studyPatterns.map((p, i) => (
                      <InsightCard key={i} type={p.type} icon={p.type === 'positive' ? TrendingUp : p.type === 'warning' ? AlertTriangle : Info} title={p.title} description={p.description} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Study Distribution */}
            <div className="metric-card">
              <SectionHeader title="This Week's Focus" />
              {weeklyDistribution.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No study sessions"
                  description="Start a focus session to see your weekly study distribution"
                />
              ) : (
                <div className="space-y-3">
                  {weeklyDistribution.map((d) => {
                    const maxMin = weeklyDistribution[0].minutes;
                    const pct = maxMin > 0 ? Math.max(8, (d.minutes / maxMin) * 100) : 0;
                    return (
                      <div key={d.subjectId} className="flex items-center gap-3 group">
                        <span className="text-xs font-medium text-muted-foreground w-24 truncate shrink-0" title={d.name}>
                          {d.name}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 group-hover:opacity-100"
                            style={{ width: `${pct}%`, backgroundColor: d.color || 'var(--color-primary)', opacity: 0.65 }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground w-12 text-right shrink-0">
                          {d.minutes}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!hiddenWidgets.includes('insights') && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="size-4 text-[var(--delulu-purple)]" />
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
                        <InsightCard
                          key={i}
                          type={insight.type}
                          icon={Icon}
                          title={insight.title}
                          description={insight.description}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {!hiddenWidgets.includes('deadlines') && (
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
            )}

            {/* Quick Actions — desktop only */}
            {!hiddenWidgets.includes('quick-actions') && (
            <Card className="hero-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Focus', icon: Timer, view: 'focus' as const },
                    { label: 'Revise', icon: BrainCircuit, view: 'revision' as const },
                    { label: 'Notes', icon: BookOpen, view: 'notes' as const },
                    { label: 'Report', icon: BarChart3, view: 'report' as const },
                    { label: 'Achievements', icon: Trophy, action: true },
                  ].map((a) => {
                    const Icon = a.icon;
                    const handleClick = 'view' in a ? () => navigate(a.view) : () => setAchievementsOpen(true);
                    return (
                      <button
                        key={'view' in a ? a.view : 'achievements'}
                        onClick={handleClick}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Icon className="size-3.5" />
                        {a.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setQuickNoteOpen(true)}
                    className="col-span-3 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors border border-dashed border-amber-500/30"
                  >
                    <StickyNote className="size-3.5" />
                    Quick Note
                  </button>
                </div>
              </CardContent>
            </Card>
            )}
          </motion.div>
        </div>
      </motion.div>

      <AchievementsDialog open={achievementsOpen} onOpenChange={setAchievementsOpen} />
      <QuickNoteDialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen} />
    </>
  );
}
