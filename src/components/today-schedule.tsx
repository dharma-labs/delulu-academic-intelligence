'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

type SlotState = 'done' | 'live' | 'next' | 'upcoming';

/**
 * "Today" — a calm vertical timeline of today's classes (spec §14/§15).
 *
 * Lives directly on the app background (no card wrapper). Driven only by the
 * real timetable + subjects; past classes recede, the current/next class is
 * subtly emphasised.
 */
export function TodaySchedule({ className }: { className?: string }) {
  const { timetableSlots, subjects, navigate, selectSubject } = useStore();
  const now = new Date();
  const day = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = useMemo(() => {
    return timetableSlots
      .filter((s) => s.day === day)
      .map((s) => {
        const [h, m] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const name = subjects.find((x) => x.id === s.subjectId)?.name || 'Class';
        const startMin = (h || 0) * 60 + (m || 0);
        // Guard against missing/invalid end times - never treat a class as
        // finished earlier than it started.
        const endMin = Math.max((eh || 0) * 60 + (em || 0), startMin + 5);
        return { ...s, name, startMin, endMin };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [timetableSlots, subjects, day]);

  const nextId = useMemo(
    () => slots.find((s) => s.startMin > nowMinutes)?.id ?? null,
    [slots, nowMinutes]
  );

  const heading = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-medium">Today</h2>
      <button
        type="button"
        onClick={() => navigate('timetable' as never)}
        className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Timetable
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );

  if (slots.length === 0) {
    return (
      <section className={cn('space-y-3', className)} aria-label="Today">
        {heading}
        <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
      </section>
    );
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Today">
      {heading}

      <ol className="space-y-0.5">
        {slots.map((s, i) => {
          const state: SlotState =
            s.endMin <= nowMinutes
              ? 'done'
              : s.startMin <= nowMinutes
                ? 'live'
                : s.id === nextId
                  ? 'next'
                  : 'upcoming';
          const isFirst = i === 0;
          const isLast = i === slots.length - 1;

          return (
            <li key={s.id} className="flex items-stretch gap-3">
              <span
                className={cn(
                  'w-12 shrink-0 pt-2 text-right font-mono text-xs tabular-nums',
                  state === 'live' ? 'font-semibold text-primary' : state === 'done' ? 'text-muted-foreground/50' : 'text-muted-foreground'
                )}
              >
                {s.startTime}
              </span>

              <span className="relative flex w-2 shrink-0 justify-center" aria-hidden>
                {(slots.length > 1) && (
                  <span
                    className={cn(
                      'absolute left-1/2 w-px -translate-x-1/2 bg-border',
                      isFirst ? 'top-3 bottom-0' : isLast ? 'top-0 h-3' : 'inset-y-0'
                    )}
                  />
                )}
                <span
                  className={cn(
                    'relative mt-2.5 rounded-full',
                    state === 'live' ? 'size-2 bg-primary' : state === 'next' ? 'size-1.5 bg-primary/50' : state === 'done' ? 'size-1.5 bg-border' : 'size-1.5 bg-muted-foreground/30'
                  )}
                />
              </span>

              <button
                type="button"
                onClick={() => {
                  if (s.subjectId) selectSubject(s.subjectId);
                  navigate('timetable' as never);
                }}
                className={cn(
                  'flex min-w-0 flex-1 items-baseline gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/50',
                  state === 'done' && 'opacity-55'
                )}
              >
                <span
                  className={cn(
                    'min-w-0 truncate text-sm',
                    state === 'live' ? 'font-medium text-foreground' : state === 'done' ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {s.name}
                </span>
                {s.room && (
                  <span className="shrink-0 text-xs text-muted-foreground">Room {s.room}</span>
                )}
                {state === 'live' && (
                  <span className="shrink-0 text-xs font-medium text-primary">now</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
