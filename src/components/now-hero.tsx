'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { buildNowContexts, NOW_KIND_LABEL } from '@/lib/now-context';
import { cn } from '@/lib/utils';
import { Sparkles, ChevronRight } from 'lucide-react';

/**
 * Compact "Delulu Now" hero for the Home screen (5.1 · spec §12).
 * Uses the shared deterministic context engine — no duplicated state.
 */
export function NowHero({ className }: { className?: string }) {
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

  const hero = useMemo(() => {
    const ctx = buildNowContexts({
      timetableSlots,
      exams,
      assignments,
      tasks,
      subjects,
      attendance,
      attendanceThreshold: profile.attendanceThreshold,
    });
    return ctx[0] ?? null;
  }, [timetableSlots, exams, assignments, tasks, subjects, attendance, profile.attendanceThreshold]);

  if (!hero) {
    return (
      <div className={cn('rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3', className)}>
        <Sparkles className="size-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delulu Now</p>
          <p className="text-sm text-muted-foreground">Nothing urgent right now — you're on top of things.</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        if (hero.subjectId) selectSubject(hero.subjectId);
        navigate(hero.view as never);
      }}
      className={cn(
        'w-full text-left rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4 card-interactive',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Delulu Now · {NOW_KIND_LABEL[hero.kind]}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight truncate">{hero.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {hero.subject ? `${hero.subject} · ` : ''}{hero.meta}
          </p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
      </div>
    </button>
  );
}
