'use client';

import { ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { SubjectFlowItem } from '@/components/home/home-sections';

/**
 * Study progress (Home spec §6) — one restrained list: subject name, a thin
 * bar on a muted track, and the percentage. One accent, no per-subject colours.
 *
 * Takes the shared `useHomeIntel().subjectFlow` items so the numbers are
 * computed in exactly one place.
 */
export function StudyProgressSection({
  items,
  limit = 5,
  className,
}: {
  items: SubjectFlowItem[];
  limit?: number;
  className?: string;
}) {
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);
  const shown = items.slice(0, limit);

  return (
    <section className={cn('space-y-3', className)} aria-label="Study progress">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Study progress</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('subjects' as never)}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            All subjects
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subjects in this semester yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {shown.map(({ subject, progress }) => (
            <li key={subject.id}>
              <button
                type="button"
                onClick={() => {
                  selectSubject(subject.id);
                  navigate('subject-detail' as never);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1 text-sm break-words">{subject.name}</span>
                <span className="hidden h-1 w-16 shrink-0 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary/70 transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {progress}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > shown.length && (
        <p className="text-xs text-muted-foreground/80">
          {items.length - shown.length} more subject{items.length - shown.length === 1 ? '' : 's'}
        </p>
      )}
    </section>
  );
}
