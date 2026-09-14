'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { buildNowContexts, NOW_KIND_LABEL, type NowContext } from '@/lib/now-context';
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

  const contexts = useMemo(
    () =>
      buildNowContexts({
        timetableSlots,
        exams,
        assignments,
        tasks,
        subjects,
        attendance,
        attendanceThreshold: profile.attendanceThreshold,
      }),
    [timetableSlots, exams, assignments, tasks, subjects, attendance, profile.attendanceThreshold]
  );

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
                  {NOW_KIND_LABEL[hero.kind]}
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
