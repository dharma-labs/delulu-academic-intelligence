'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { buildNowContexts, NOW_KIND_LABEL, NOW_ACTION_LABEL } from '@/lib/now-context';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

/**
 * "Delulu Now" — the Home hero (5.1 spec §12).
 *
 * One dominant, calm surface answering "what matters right now". Uses the shared
 * deterministic context engine (lib/now-context) so there is exactly one
 * implementation of this logic across Home and the Now view.
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
      <section
        className={cn(
          'rounded-3xl bg-primary/[0.04] p-6 md:p-8',
          className
        )}
        aria-label="Delulu Now"
      >
        <p className="text-xs font-medium text-muted-foreground">Delulu Now</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
          You&apos;re all clear right now.
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          No classes, deadlines or attendance warnings need you today.
        </p>
      </section>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (hero.subjectId) selectSubject(hero.subjectId);
        navigate(hero.view as never);
      }}
      className={cn(
        'group w-full rounded-3xl bg-primary/[0.05] p-6 text-left transition-colors duration-200',
        'hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'md:p-8',
        className
      )}
      aria-label="Delulu Now"
    >
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="font-medium">Delulu Now</span>
        <span aria-hidden className="text-muted-foreground/40">·</span>
        <span className="font-medium text-primary">{NOW_KIND_LABEL[hero.kind]}</span>
      </p>

      <p className="mt-3 break-words text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
        {hero.title}
      </p>

      {hero.subject && (
        <p className="mt-2 break-words text-sm text-muted-foreground md:text-base">
          {hero.subject}
        </p>
      )}

      <p className="mt-1 text-sm font-medium text-foreground/80 md:text-base">
        {hero.meta}
      </p>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        {NOW_ACTION_LABEL[hero.kind]}
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
