'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Lock, Clock, Flame, BookOpen, Target } from 'lucide-react';
import { useStore, calculateCGPA, getStudyStreak } from '@/lib/store';
import { MetricCard } from '@/components/shared';
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
  type Achievement,
} from '@/lib/achievements';

// ─── Animation ──────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

// ─── Achievement Card ───────────────────────────────────────────
function AchievementCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  const meta = CATEGORY_META[achievement.category];

  return (
    <div
      className={cn(
        'relative rounded-xl border p-3.5 transition-all duration-200',
        unlocked
          ? 'metric-card bg-card border-border/80'
          : 'bg-card/50 border-border/30 opacity-40',
      )}
    >
      {unlocked && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 0 16px -4px rgba(var(--primary-rgb), 0.12)',
          }}
        />
      )}
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center text-lg shrink-0',
            unlocked ? 'bg-primary/10' : 'bg-secondary',
          )}
        >
          {unlocked ? achievement.icon : <Lock className="size-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn('text-sm font-semibold truncate', unlocked ? 'text-foreground' : 'text-muted-foreground')}>
              {achievement.name}
            </span>
          </div>
          <p className={cn('text-xs leading-relaxed', unlocked ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
            {achievement.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
              <Star className="size-2.5 mr-0.5 text-amber-500" />
              {achievement.xpReward} XP
            </Badge>
            <span className={cn('text-[9px] font-semibold uppercase tracking-wider', meta.color, meta.darkColor)}>
              {meta.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

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

  const { achievementState, unlocked, totalXP, levelInfo, studyHours, cgpa, streak } = useMemo(() => {
    const storeStreak = getStudyStreak({ studySessions });
    const storeCGPA = calculateCGPA({ subjects, assessments });

    const state = buildAchievementState({
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

    const unlocked = checkAchievements(state);
    const unlockedIds = unlocked.map((a) => a.id);
    const totalXP = getTotalXP(unlockedIds);
    const levelInfo = getLevel(totalXP);
    const studyHours = (state.totalStudyMinutes / 60).toFixed(1);

    return {
      achievementState: state,
      unlocked,
      totalXP,
      levelInfo,
      studyHours,
      cgpa: storeCGPA,
      streak: storeStreak,
    };
  }, [studySessions, attendance, syllabusUnits, subjects, assessments, notes, tasks]);

  // Group achievements by category
  const categories = useMemo(() => {
    const catOrder: Achievement['category'][] = ['study', 'attendance', 'academic', 'streak', 'social'];
    return catOrder.map((cat) => ({
      key: cat,
      meta: CATEGORY_META[cat],
      achievements: ACHIEVEMENTS.filter((a) => a.category === cat),
    }));
  }, []);

  const unlockedIds = useMemo(() => new Set(unlocked.map((a) => a.id)), [unlocked]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto scrollbar-thin p-0">
        <div className="p-5 md:p-6 space-y-5">
          {/* Header */}
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Trophy className="size-5 text-amber-500" />
                Achievements
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Star className="size-3 mr-1" />
                {totalXP} XP
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Track your academic progress and unlock rewards
            </DialogDescription>
          </DialogHeader>

          {/* Level Progress Hero Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="hero-card p-5">
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-4xl font-bold text-gradient tabular-nums">{levelInfo.level}</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mt-0.5">Level</span>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {levelInfo.currentXP} / {levelInfo.nextLevelXP} XP to next level
                    </span>
                    <span className="text-xs font-bold tabular-nums text-primary">
                      {Math.round(levelInfo.progress * 100)}%
                    </span>
                  </div>
                  <div className="progress-thin progress-animate h-2.5">
                    <div
                      className="bg-primary"
                      style={{ width: `${levelInfo.progress * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalXP} XP</span> total earned
                  {' · '}
                  <span className="font-semibold text-foreground">{unlocked.length}</span>
                  {' / '}{ACHIEVEMENTS.length} achievements unlocked
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <MetricCard
              label="Achievements"
              value={`${unlocked.length}/${ACHIEVEMENTS.length}`}
              icon={Trophy}
              iconColor="text-amber-500"
            />
            <MetricCard
              label="Study Hours"
              value={`${studyHours}h`}
              icon={Clock}
              iconColor="text-blue-500"
            />
            <MetricCard
              label="Streak"
              value={`${streak}d`}
              icon={Flame}
              iconColor="text-orange-500"
            />
            <MetricCard
              label="CGPA"
              value={cgpa.toFixed(1)}
              icon={Target}
              iconColor="text-purple-500"
            />
          </div>

          {/* Achievement Categories */}
          <div className="space-y-6">
            {categories.map((cat) => {
              const unlockedInCat = cat.achievements.filter((a) => unlockedIds.has(a.id)).length;
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="section-label">{cat.meta.label}</span>
                    <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                      {unlockedInCat}/{cat.achievements.length}
                    </span>
                  </div>
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 stagger-children"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {cat.achievements.map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        unlocked={unlockedIds.has(achievement.id)}
                      />
                    ))}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
