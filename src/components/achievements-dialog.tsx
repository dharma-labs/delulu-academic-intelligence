'use client';

import { useMemo } from 'react';
import { Check, Lock, Trophy } from 'lucide-react';
import { useStore, calculateCGPA, getStudyStreak } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ACHIEVEMENTS,
  CATEGORY_META,
  checkAchievements,
  getTotalXP,
  getLevel,
  buildAchievementState,
  getAchievementProgress,
  type Achievement,
  type AchievementProgress,
  type AchievementState,
} from '@/lib/achievements';

/**
 * Achievements — a calm, scannable list (not a card grid).
 *
 * Everything shown is derived from real store data through lib/achievements:
 * unlock state from the achievement conditions, progress from
 * `getAchievementProgress` (same AchievementState, so the two can never
 * disagree). Nothing is truncated, and locked rows never show a fake bar.
 */

const CATEGORY_ORDER: Achievement['category'][] = ['study', 'attendance', 'academic', 'streak', 'social'];

type RowState = 'unlocked' | 'progress' | 'locked';

interface AchievementRow {
  achievement: Achievement;
  state: RowState;
  progress: AchievementProgress | null;
}

// ─── Row ────────────────────────────────────────────────────────

function AchievementListItem({ row }: { row: AchievementRow }) {
  const { achievement, state, progress } = row;
  const unlocked = state === 'unlocked';
  const pct = progress ? Math.round((progress.current / progress.target) * 100) : 0;

  return (
    <li className={cn('flex items-start gap-3 py-3', !unlocked && 'opacity-55')}>
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          unlocked ? 'bg-primary' : state === 'progress' ? 'bg-primary/40' : 'bg-muted-foreground/40',
        )}
      />

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium break-words', unlocked ? 'text-foreground' : 'text-muted-foreground')}>
          {achievement.name}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{achievement.description}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        {unlocked ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Check className="size-3.5" aria-hidden />
            Unlocked
          </span>
        ) : progress ? (
          <>
            <span className="text-xs tabular-nums text-muted-foreground">
              {progress.current} / {progress.target}
            </span>
            <span className="block h-1 w-16 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <span
                className="block h-full rounded-full bg-primary/70 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
            <Lock className="size-3" aria-hidden />
            Locked
          </span>
        )}
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{achievement.xpReward} XP</span>
      </div>
    </li>
  );
}

// ─── Main component ─────────────────────────────────────────────

interface AchievementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementsDialog({ open, onOpenChange }: AchievementsDialogProps) {
  const studySessions = useStore((s) => s.studySessions);
  const attendance = useStore((s) => s.attendance);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const subjects = useStore((s) => s.subjects);
  const assessments = useStore((s) => s.assessments);
  const notes = useStore((s) => s.notes);
  const tasks = useStore((s) => s.tasks);
  const profile = useStore((s) => s.profile);

  const { state, unlockedIds, totalXP, levelInfo, studyHours, cgpa, streak } = useMemo(() => {
    const storeStreak = getStudyStreak({ studySessions });
    const storeCGPA = calculateCGPA({ subjects, assessments, profile });

    const achievementState: AchievementState = buildAchievementState({
      studySessions,
      attendance,
      syllabusUnits,
      subjects,
      assessments,
      notes,
      tasks,
      streak: storeStreak,
      cgpa: storeCGPA,
    });

    const unlocked = checkAchievements(achievementState);
    const totalXP = getTotalXP(unlocked.map((a) => a.id));

    return {
      state: achievementState,
      unlockedIds: new Set(unlocked.map((a) => a.id)),
      totalXP,
      levelInfo: getLevel(totalXP),
      studyHours: (achievementState.totalStudyMinutes / 60).toFixed(1),
      cgpa: storeCGPA,
      streak: storeStreak,
    };
  }, [studySessions, attendance, syllabusUnits, subjects, assessments, notes, tasks, profile]);

  // Grouped by category, unlocked first, then in-progress, then locked.
  const groups = useMemo(() => {
    const rank: Record<RowState, number> = { unlocked: 0, progress: 1, locked: 2 };
    return CATEGORY_ORDER.map((category) => {
      const rows: AchievementRow[] = ACHIEVEMENTS.filter((a) => a.category === category).map((achievement) => {
        const unlocked = unlockedIds.has(achievement.id);
        // Only a measurable, started goal shows a bar — never a zeroed one.
        const measured = unlocked ? null : getAchievementProgress(achievement, state);
        const progress = measured && measured.current > 0 ? measured : null;
        const rowState: RowState = unlocked ? 'unlocked' : progress ? 'progress' : 'locked';
        return { achievement, state: rowState, progress };
      });
      rows.sort((a, b) => rank[a.state] - rank[b.state]);
      return {
        key: category,
        label: CATEGORY_META[category]?.label ?? category,
        rows,
        unlockedCount: rows.filter((r) => r.state === 'unlocked').length,
      };
    }).filter((group) => group.rows.length > 0);
  }, [state, unlockedIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto scrollbar-thin p-0 sm:max-w-3xl">
        <div className="p-5 md:p-6 space-y-6">
          {/* Header */}
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Trophy className="size-5 text-primary" aria-hidden />
                Achievements
              </DialogTitle>
              <Badge variant="secondary" className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {totalXP} XP
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Track your academic progress and unlock rewards
            </DialogDescription>
          </DialogHeader>

          {/* Level progress */}
          <section className="rounded-2xl bg-secondary/40 p-4 md:p-5" aria-label="Level progress">
            <div className="flex items-center gap-4">
              <div className="flex shrink-0 flex-col items-center">
                <span className="text-3xl font-semibold tabular-nums tracking-tight">{levelInfo.level}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Level</span>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {levelInfo.currentXP} / {levelInfo.nextLevelXP} XP to next level
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {Math.round(levelInfo.progress * 100)}%
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-label="XP to next level"
                  aria-valuemin={0}
                  aria-valuemax={levelInfo.nextLevelXP}
                  aria-valuenow={levelInfo.currentXP}
                  aria-valuetext={`${levelInfo.currentXP} of ${levelInfo.nextLevelXP} XP`}
                >
                  <div
                    className="h-full rounded-full bg-primary/80 transition-all duration-500 ease-out"
                    style={{ width: `${levelInfo.progress * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">{totalXP} XP</span> earned
                  <span aria-hidden className="mx-1.5 text-muted-foreground/40">·</span>
                  <span className="font-medium text-foreground tabular-nums">{unlockedIds.size}</span> of{' '}
                  {ACHIEVEMENTS.length} unlocked
                </p>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground/80">
              <span className="tabular-nums">{studyHours}h</span> studied
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="tabular-nums">{streak}d</span> streak
              <span aria-hidden className="mx-1.5 text-muted-foreground/40">·</span>
              CGPA <span className="tabular-nums">{cgpa.toFixed(1)}</span>
            </p>
          </section>

          {/* Achievement list, grouped by category */}
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="section-label">{group.label}</h3>
                  <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                    {group.unlockedCount}/{group.rows.length}
                  </span>
                </div>
                <ul className="mt-1 divide-y divide-border/50">
                  {group.rows.map((row) => (
                    <AchievementListItem key={row.achievement.id} row={row} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
