'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import {
  useStore,
  getSubjectAttendance,
  getSubjectProgress,
  getSubjectSignal,
} from '@/lib/store';
import { useSemesterFilter } from '@/lib/use-semester-filter';
import {
  buildHomeInsights,
  buildHomeRecommendations,
  buildStudyPatterns,
  type HomeInsight as HomeInsightItem,
  type HomeRecommendation,
  type HomeIntelInput,
} from '@/lib/home-insights';
import { cn } from '@/lib/utils';
import { ArrowRight, BarChart3, BookOpen, BrainCircuit, ChevronRight, StickyNote, Timer, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SocietyTracker, SocietyWidget } from '@/components/society-tracker';
import type { SignalStatus, Subject } from '@/lib/types';

/**
 * Deeper Home sections (one level below the main hierarchy).
 *
 * Everything here is derived from real store data. These are intentionally
 * quieter than the primary sections: no metric cards, one accent colour, and
 * titles in sentence case.
 */

// ─── Shared intel ────────────────────────────────────────────────

export interface SubjectFlowItem {
  subject: Subject;
  progress: number;
  attendance: { present: number; total: number; percentage: number };
  signal: SignalStatus;
}

export interface DeadlineItem {
  title: string;
  subjectName: string;
  date: string;
  type: 'exam' | 'assignment';
  days: number;
}

export interface HeatDay {
  dateStr: string;
  label: string;
  minutes: number;
  count: number;
  isToday: boolean;
}

export interface FocusSlice {
  subjectId: string;
  name: string;
  minutes: number;
  share: number;
}

export interface HomeIntel {
  recommendations: HomeRecommendation[];
  insights: HomeInsightItem[];
  patterns: HomeInsightItem[];
  subjectFlow: SubjectFlowItem[];
  deadlines: DeadlineItem[];
  heatDays: HeatDay[];
  focusSlices: FocusSlice[];
}

/** One computation shared by every deeper Home section. */
export function useHomeIntel(): HomeIntel {
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const attendance = useStore((s) => s.attendance);
  const assessments = useStore((s) => s.assessments);
  const revisionItems = useStore((s) => s.revisionItems);
  const studySessions = useStore((s) => s.studySessions);
  const exams = useStore((s) => s.exams);
  const assignments = useStore((s) => s.assignments);
  const tasks = useStore((s) => s.tasks);
  const profile = useStore((s) => s.profile);
  const { semesterSubjects } = useSemesterFilter();

  return useMemo(() => {
    const input: HomeIntelInput = {
      subjects,
      activeSubjects: semesterSubjects,
      syllabusUnits,
      exams,
      assignments,
      tasks,
      attendance,
      assessments,
      revisionItems,
      studySessions,
      profile,
    };

    const subjectFlow: SubjectFlowItem[] = semesterSubjects
      .map((subject) => ({
        subject,
        progress: getSubjectProgress({ syllabusUnits }, subject.id),
        attendance: getSubjectAttendance({ attendance }, subject.id),
        signal: getSubjectSignal(input as never, subject.id),
      }))
      .sort((a, b) => a.progress - b.progress);

    const today = format(new Date(), 'yyyy-MM-dd');
    const deadlines: DeadlineItem[] = [
      ...exams
        .filter((e) => e.status !== 'completed' && e.date >= today)
        .map((e) => ({ title: e.name, subjectId: e.subjectId, date: e.date, type: 'exam' as const })),
      ...assignments
        .filter((a) => a.status !== 'completed' && a.deadline >= today)
        .map((a) => ({ title: a.title, subjectId: a.subjectId, date: a.deadline, type: 'assignment' as const })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map((d) => ({
        title: d.title,
        subjectName: subjects.find((s) => s.id === d.subjectId)?.name ?? '',
        date: d.date,
        type: d.type,
        days: Math.ceil(
          (new Date(d.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
        ),
      }));

    // This week's study rhythm (Mon-start, matching the rest of Home).
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const heatDays: HeatDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const daySessions = studySessions.filter((s) => s.date === dateStr);
      return {
        dateStr,
        label: format(d, 'EEEEE'),
        minutes: Math.floor(daySessions.reduce((sum, s) => sum + s.duration / 60, 0)),
        count: daySessions.length,
        isToday: dateStr === today,
      };
    });

    const sevenDaysAgo = format(addDays(new Date(), -6), 'yyyy-MM-dd');
    const bySubject = new Map<string, number>();
    for (const s of studySessions.filter((x) => x.date >= sevenDaysAgo)) {
      bySubject.set(s.subjectId, (bySubject.get(s.subjectId) ?? 0) + s.duration / 60);
    }
    const totalMinutes = Array.from(bySubject.values()).reduce((a, b) => a + b, 0);
    const focusSlices: FocusSlice[] = Array.from(bySubject.entries())
      .map(([subjectId, minutes]) => ({
        subjectId,
        name: subjects.find((s) => s.id === subjectId)?.name ?? 'Subject',
        minutes: Math.round(minutes),
        share: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    return {
      recommendations: buildHomeRecommendations(input),
      insights: buildHomeInsights(input),
      patterns: buildStudyPatterns(input),
      subjectFlow,
      deadlines,
      heatDays,
      focusSlices,
    };
  }, [
    subjects,
    semesterSubjects,
    syllabusUnits,
    attendance,
    assessments,
    revisionItems,
    studySessions,
    exams,
    assignments,
    tasks,
    profile,
  ]);
}

// ─── Layout primitives ───────────────────────────────────────────

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const INSIGHT_DOT: Record<HomeInsightItem['type'], string> = {
  positive: 'bg-[var(--delulu-success)]',
  warning: 'bg-[var(--delulu-warning)]',
  critical: 'bg-[var(--delulu-danger)]',
  info: 'bg-primary',
};

function QuietInsightRow({ type, title, description }: HomeInsightItem) {
  return (
    <div className="flex gap-3 py-1.5">
      <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', INSIGHT_DOT[type])} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

// ─── Optional insight line (hierarchy step 6) ────────────────────

/**
 * One quiet line about what to do next. Renders nothing when there is
 * nothing meaningful to say.
 */
export function HomeInsightLine({
  recommendations,
  insights,
  onOpen,
  className,
}: {
  recommendations: HomeRecommendation[];
  insights: HomeInsightItem[];
  onOpen: (view: string, subjectId?: string) => void;
  className?: string;
}) {
  const rec = recommendations[0];
  const insight = insights[0];

  const line = rec
    ? { title: rec.title, detail: rec.description, view: rec.view, subjectId: rec.subjectId }
    : insight
      ? { title: insight.title, detail: insight.description, view: 'analytics', subjectId: undefined }
      : null;

  if (!line) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(line.view, line.subjectId)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:bg-muted/40',
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm">
        {line.title}
        {line.detail && <span className="text-muted-foreground"> · {line.detail}</span>}
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  );
}

// ─── Subjects ────────────────────────────────────────────────────

export function SubjectFlowSection({
  items,
  limit,
  className,
}: {
  items: SubjectFlowItem[];
  limit?: number;
  className?: string;
}) {
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);
  const shown = typeof limit === 'number' ? items.slice(0, limit) : items;

  if (items.length === 0) {
    return (
      <Section title="Subjects" className={className}>
        <p className="text-sm text-muted-foreground">No subjects in this semester yet.</p>
      </Section>
    );
  }

  return (
    <Section
      title="Subjects"
      className={className}
      action={
        <button
          type="button"
          onClick={() => navigate('subjects' as never)}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          All subjects
          <ChevronRight className="size-3.5" />
        </button>
      }
    >
      <div className="space-y-1">
        {shown.map(({ subject, progress, attendance: att }) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => {
              selectSubject(subject.id);
              navigate('subject-detail' as never);
            }}
            className="w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm">{subject.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary/70 transition-all duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Attendance {att.total > 0 ? `${att.percentage}%` : '—'}
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              {subject.credits} credits
            </p>
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Deadlines ───────────────────────────────────────────────────

export function DeadlinesSection({ items, className }: { items: DeadlineItem[]; className?: string }) {
  const navigate = useStore((s) => s.navigate);

  if (items.length === 0) {
    return (
      <Section title="Deadlines" className={className}>
        <p className="text-sm text-muted-foreground">Nothing due ahead. Enjoy the quiet.</p>
      </Section>
    );
  }

  return (
    <Section
      title="Deadlines"
      className={className}
      action={
        <button
          type="button"
          onClick={() => navigate('calendar' as never)}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Calendar
          <ChevronRight className="size-3.5" />
        </button>
      }
    >
      <div className="space-y-1">
        {items.map((d, i) => (
          <button
            key={`${d.type}-${i}`}
            type="button"
            onClick={() => navigate(d.type === 'exam' ? ('exams' as never) : ('assignments' as never))}
            className="flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm">{d.title}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {d.subjectName || (d.type === 'exam' ? 'Exam' : 'Assignment')}
              </span>
            </span>
            <span
              className={cn(
                'shrink-0 text-xs font-medium tabular-nums',
                d.days <= 1 ? 'text-[var(--delulu-danger)]' : d.days <= 5 ? 'text-[var(--delulu-warning)]' : 'text-muted-foreground'
              )}
            >
              {d.days <= 0 ? 'Today' : d.days === 1 ? 'Tomorrow' : `In ${d.days}d`}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Recommendations / insights / patterns ───────────────────────

export function RecommendationsSection({
  items,
  className,
}: {
  items: HomeRecommendation[];
  className?: string;
}) {
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);

  if (items.length === 0) return null;

  return (
    <Section title="Focus now" className={className}>
      <div className="space-y-1">
        {items.map((rec, i) => (
          <button
            key={`${rec.title}-${i}`}
            type="button"
            onClick={() => {
              if (rec.subjectId) selectSubject(rec.subjectId);
              navigate(rec.view as never);
            }}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{rec.title}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{rec.description}</span>
            </span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 text-xs font-medium',
                rec.urgency === 'critical' ? 'text-[var(--delulu-danger)]' : rec.urgency === 'attention' ? 'text-[var(--delulu-warning)]' : 'text-muted-foreground'
              )}
            >
              {rec.actionLabel}
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

export function InsightsSection({ items, className }: { items: HomeInsightItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Section title="Insights" className={className}>
      <div className="divide-y divide-border/60">
        {items.map((insight, i) => (
          <QuietInsightRow key={`${insight.title}-${i}`} {...insight} />
        ))}
      </div>
    </Section>
  );
}

export function StudyPatternsSection({ items, className }: { items: HomeInsightItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Section title="Study patterns" className={className}>
      <div className="divide-y divide-border/60">
        {items.map((pattern, i) => (
          <QuietInsightRow key={`${pattern.title}-${i}`} {...pattern} />
        ))}
      </div>
    </Section>
  );
}

// ─── This week ───────────────────────────────────────────────────

export function WeeklyActivitySection({ days, className }: { days: HeatDay[]; className?: string }) {
  const navigate = useStore((s) => s.navigate);
  const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);
  const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);
  const sessions = days.reduce((s, d) => s + d.count, 0);

  return (
    <Section
      title="This week"
      className={className}
      action={
        <button
          type="button"
          onClick={() => navigate('analytics' as never)}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Analytics
          <ChevronRight className="size-3.5" />
        </button>
      }
    >
      {sessions === 0 ? (
        <p className="text-sm text-muted-foreground">No study sessions recorded yet this week.</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const intensity = d.count === 0 ? 0 : Math.max(0.18, Math.min(d.minutes / maxMinutes, 1));
              return (
                <div key={d.dateStr} className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn('h-10 w-full rounded-xl transition-colors', d.isToday && 'ring-1 ring-primary/40')}
                    style={{ backgroundColor: intensity > 0 ? `rgba(var(--primary-rgb), ${intensity})` : 'var(--secondary)' }}
                  />
                  <span className={cn('text-xs', d.isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.floor(totalMinutes / 60) > 0 && `${Math.floor(totalMinutes / 60)}h `}
            {totalMinutes % 60}m studied over {sessions} session{sessions === 1 ? '' : 's'}
          </p>
        </>
      )}
    </Section>
  );
}

export function WeeklyFocusSection({ slices, className }: { slices: FocusSlice[]; className?: string }) {
  if (slices.length === 0) return null;
  const maxMinutes = Math.max(...slices.map((s) => s.minutes), 1);

  return (
    <Section title="Where your time went" className={className}>
      <div className="space-y-3">
        {slices.map((slice) => (
          <div key={slice.subjectId} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={slice.name}>
              {slice.name}
            </span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-primary/60 transition-all duration-300"
                style={{ width: `${Math.max(6, (slice.minutes / maxMinutes) * 100)}%` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {slice.minutes}m
              <span className="ml-1 text-muted-foreground/60">{slice.share}%</span>
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Quick actions ───────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Focus', icon: Timer, view: 'focus' },
  { label: 'Revise', icon: BrainCircuit, view: 'revision' },
  { label: 'Notes', icon: BookOpen, view: 'notes' },
  { label: 'Report', icon: BarChart3, view: 'report' },
] as const;

export function QuickActionsSection({
  onAchievements,
  onQuickNote,
  className,
}: {
  onAchievements: () => void;
  onQuickNote: () => void;
  className?: string;
}) {
  const navigate = useStore((s) => s.navigate);

  return (
    <Section title="Jump back in" className={className}>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.view}
              type="button"
              onClick={() => navigate(a.view as never)}
              className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Icon className="size-3.5" />
              {a.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAchievements}
          className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Trophy className="size-3.5" />
          Achievements
        </button>
        <button
          type="button"
          onClick={onQuickNote}
          className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <StickyNote className="size-3.5" />
          Quick note
        </button>
      </div>
    </Section>
  );
}

// ─── Societies & ECA ─────────────────────────────────────────────

export function SocietiesSection({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={className}>
      <CardHeader className="px-5 pb-2 pt-3">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            Societies &amp; ECA
          </CardTitle>
          <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </button>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {expanded ? <SocietyTracker /> : <SocietyWidget />}
      </CardContent>
    </Card>
  );
}
