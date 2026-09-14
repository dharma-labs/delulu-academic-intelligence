'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDays, ChevronRight } from 'lucide-react';

/**
 * "Today's Schedule" — compact timeline of today's classes (spec §14/§15).
 * Pure, deterministic; driven only by the real timetable + subjects.
 */
export function TodaySchedule({ className }: { className?: string }) {
  const { timetableSlots, subjects, navigate, selectSubject } = useStore();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = useMemo(() => {
    const list = timetableSlots
      .filter((s) => s.day === now.getDay())
      .map((s) => {
        const [h, m] = s.startTime.split(':').map(Number);
        const name = subjects.find((x) => x.id === s.subjectId)?.name || 'Class';
        return { ...s, name, startMin: (h || 0) * 60 + (m || 0) };
      })
      .sort((a, b) => a.startMin - b.startMin);
    return list;
  }, [timetableSlots, subjects, now.getDay()]);

  if (slots.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-border/50 bg-card p-4', className)}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Today's Schedule</span>
        </div>
        <p className="text-xs text-muted-foreground">No classes scheduled today.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-border/50 bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Today's Schedule</span>
        </div>
        <button
          onClick={() => navigate('timetable' as never)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
        >
          Timetable <ChevronRight className="size-3" />
        </button>
      </div>

      <div className="space-y-0.5">
        {slots.map((s) => {
          const past = s.startMin < nowMinutes;
          const live = !past && s.startMin - nowMinutes <= 60;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (s.subjectId) selectSubject(s.subjectId);
                navigate('timetable' as never);
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50',
                live && 'bg-primary/5'
              )}
            >
              <span className={cn('text-xs font-mono tabular-nums shrink-0 w-12', past ? 'text-muted-foreground/50' : live ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {s.startTime}
              </span>
              <span className={cn('text-sm truncate min-w-0', past ? 'text-muted-foreground/60' : 'text-foreground')}>
                {s.name}
              </span>
              {s.room && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">Room {s.room}</span>}
              {live && <span className="text-[9px] text-primary font-semibold shrink-0">now</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
