'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Today's subjects (Home spec §5) — a compact horizontal row of small subject
 * surfaces built from the real timetable for today (name primary, time
 * secondary). Renders nothing when there are no classes today.
 */
export function TodaysSubjectsSection({ className }: { className?: string }) {
  const timetableSlots = useStore((s) => s.timetableSlots);
  const subjects = useStore((s) => s.subjects);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);

  const today = new Date().getDay();

  const slots = useMemo(
    () =>
      timetableSlots
        .filter((s) => s.day === today)
        .map((s) => ({ ...s, name: subjects.find((x) => x.id === s.subjectId)?.name ?? 'Class' }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timetableSlots, subjects, today]
  );

  if (slots.length === 0) return null;

  return (
    <section className={cn('space-y-3', className)} aria-label="Today's subjects">
      <h2 className="text-sm font-medium">Today&apos;s subjects</h2>

      <div className="flex flex-wrap items-stretch gap-2.5">
        {slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => {
              if (slot.subjectId) selectSubject(slot.subjectId);
              navigate('timetable' as never);
            }}
            className="w-[9.5rem] min-w-0 rounded-2xl bg-secondary/40 px-3.5 py-3 text-left transition-colors duration-200 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="block text-sm font-medium break-words">{slot.name}</span>
            <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
              {slot.startTime}
              {slot.endTime ? ` – ${slot.endTime}` : ''}
            </span>
            {slot.room && (
              <span className="mt-0.5 block text-xs text-muted-foreground/80">Room {slot.room}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
