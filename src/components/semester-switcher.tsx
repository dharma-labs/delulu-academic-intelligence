'use client';

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ChevronDown, History, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSemesterFilter } from '@/lib/use-semester-filter';

/**
 * Global semester context switcher (Delulu 5.1 · spec §52/§53).
 * Switching semester only changes the viewing context — no data is ever
 * overwritten; earlier semesters remain fully accessible as history.
 */
export function SemesterSwitcher({ className }: { className?: string }) {
  const { activeSemester, currentSemester, availableSemesters, setSelectedSemester } = useSemesterFilter();
  const isViewingPast = activeSemester < currentSemester;

  const past = availableSemesters.filter((s) => s < currentSemester);
  const future = availableSemesters.filter((s) => s > currentSemester);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60',
            isViewingPast && 'border-amber-500/40 text-amber-600 dark:text-amber-400',
            className
          )}
          aria-label="Switch semester"
        >
          {isViewingPast ? <History className="size-3.5" /> : null}
          <span>Semester {activeSemester}</span>
          {isViewingPast && <span className="text-[10px] opacity-80">· Archived</span>}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Current
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setSelectedSemester(currentSemester)}>
          <Check className={cn('size-3.5', activeSemester === currentSemester ? 'opacity-100' : 'opacity-0')} />
          Semester {currentSemester}
        </DropdownMenuItem>

        {past.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Previous
            </DropdownMenuLabel>
            {past.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSelectedSemester(s)}>
                <Check className={cn('size-3.5', activeSemester === s ? 'opacity-100' : 'opacity-0')} />
                Semester {s}
                <span className="ml-auto text-[10px] text-muted-foreground">archived</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {future.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Upcoming
            </DropdownMenuLabel>
            {future.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSelectedSemester(s)}>
                <Check className={cn('size-3.5', activeSemester === s ? 'opacity-100' : 'opacity-0')} />
                Semester {s}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {isViewingPast && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedSemester(currentSemester)}>
              <History className="size-3.5" />
              Back to current semester
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
