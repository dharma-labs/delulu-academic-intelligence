'use client';

import { format } from 'date-fns';
import { Settings2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Quiet Home greeting (hierarchy step 1) + the existing widget customisation.
 * Deliberately small: hierarchy comes from the sections beneath it.
 */
export function HomeHeader({
  widgets,
  hiddenWidgets,
  onToggleWidget,
  className,
}: {
  widgets: readonly { id: string; label: string }[];
  hiddenWidgets: string[];
  onToggleWidget: (id: string) => void;
  className?: string;
}) {
  const profile = useStore((s) => s.profile);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="truncate text-base font-medium tracking-tight">
          {greeting}, {profile.name}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{format(new Date(), 'EEEE, d MMMM')}</p>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
            aria-label="Customize dashboard"
          >
            <Settings2 className="size-3.5" />
            <span className="ml-1.5 hidden md:inline">Customize</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sections</p>
          <div className="space-y-1.5">
            {widgets.map((w) => (
              <label key={w.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={!hiddenWidgets.includes(w.id)} onCheckedChange={() => onToggleWidget(w.id)} />
                <span className="text-sm">{w.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
}
