'use client';

import { Trophy, Info } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function LeaderboardOptIn() {
  const leaderboardOptIn = useStore((s) => s.leaderboardOptIn);
  const setLeaderboardOptIn = useStore((s) => s.setLeaderboardOptIn);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button
          role="switch"
          aria-checked={leaderboardOptIn}
          onClick={() => setLeaderboardOptIn(!leaderboardOptIn)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
            leaderboardOptIn ? 'bg-primary' : 'bg-input'
          )}
        >
          <span
            className={cn(
              'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
              leaderboardOptIn ? 'translate-x-3.5' : 'translate-x-0'
            )}
          />
        </button>
        <span className="text-sm font-medium flex items-center gap-1.5">
          <Trophy className="size-3.5 text-muted-foreground" />
          Appear on leaderboard
        </span>
      </label>
      <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1 pl-12">
        <Info className="size-3 shrink-0 mt-0.5" />
        Your CGPA ranking will be visible to others. You can opt out anytime.
      </p>
    </div>
  );
}
