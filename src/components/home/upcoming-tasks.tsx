'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Upcoming tasks (Home spec §4) — lightweight rows over the real task list.
 *
 * No cards, no analytics: title + due text, and one quiet "+ Add task"
 * affordance that opens the existing Tasks view (tasks are created there).
 */
export function UpcomingTasksSection({
  limit = 5,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  const tasks = useStore((s) => s.tasks);
  const navigate = useStore((s) => s.navigate);

  const rows = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return tasks
      .filter((t) => !t.completed)
      .map((t) => {
        const days = t.dueDate
          ? Math.ceil((new Date(`${t.dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
          : null;
        return { task: t, dueDate: t.dueDate ?? null, days };
      })
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      })
      .slice(0, limit);
  }, [tasks, limit]);

  const openCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  return (
    <section className={cn('space-y-3', className)} aria-label="Upcoming tasks">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Upcoming tasks</h2>
        <button
          type="button"
          onClick={() => navigate('tasks' as never)}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          Add task
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">You&apos;re clear for today.</p>
      ) : (
        <ul className="space-y-0.5">
          {rows.map(({ task, days }) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => navigate('tasks' as never)}
                className="flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 text-sm break-words">{task.title}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs tabular-nums',
                    days === null
                      ? 'text-muted-foreground/70'
                      : days < 0
                        ? 'text-[var(--delulu-danger)]'
                        : days === 0
                          ? 'text-[var(--delulu-warning)]'
                          : 'text-muted-foreground',
                  )}
                >
                  {days === null
                    ? 'No due date'
                    : days < 0
                      ? 'Overdue'
                      : days === 0
                        ? 'Due today'
                        : days === 1
                          ? 'Due tomorrow'
                          : `In ${days} days`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openCount > rows.length && (
        <p className="text-xs text-muted-foreground/80">
          {openCount - rows.length} more open
        </p>
      )}
    </section>
  );
}
