'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';

import { useStore, calculateCGPA, getStudyStreak } from '@/lib/store';
import { useSemesterFilter } from '@/lib/use-semester-filter';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

import { NowHero } from '@/components/now-hero';
import { TodaySchedule } from '@/components/today-schedule';
import { AcademicSnapshot } from '@/components/home/academic-snapshot';
import { ProgressSummary } from '@/components/home/progress-summary';
import { HomeHeader } from '@/components/home/home-header';
import { UpcomingTasksSection } from '@/components/home/upcoming-tasks';
import { TodaysSubjectsSection } from '@/components/home/todays-subjects';
import { StudyProgressSection } from '@/components/home/study-progress';
import {
  DeadlinesSection,
  HomeInsightLine,
  InsightsSection,
  QuickActionsSection,
  RecommendationsSection,
  SocietiesSection,
  StudyPatternsSection,
  WeeklyActivitySection,
  WeeklyFocusSection,
  useHomeIntel,
} from '@/components/home/home-sections';
import { NEPExitCalculator } from '@/components/nep-exit-calculator';
import { AchievementsDialog } from '@/components/achievements-dialog';
import { QuickNoteDialog } from '@/components/quick-note-dialog';
import { KnowledgeLine } from '@/components/home/knowledge-line';

// -- Section visibility (unchanged behaviour, refreshed wording) --
const DESKTOP_WIDGETS = [
  { id: 'academic-flow', label: 'Subjects' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'todays-focus', label: 'Focus now' },
  { id: 'insights', label: 'Insights' },
  { id: 'study-patterns', label: 'Study patterns' },
  { id: 'weekly-activity', label: 'This week' },
  { id: 'quick-actions', label: 'Jump back in' },
] as const;

const MOBILE_WIDGETS = [
  { id: 'subject-progress', label: 'Subjects' },
  { id: 'insight', label: 'Next step' },
  { id: 'quick-actions', label: 'Jump back in' },
] as const;

function useHiddenWidgets(): [string[], (id: string) => void] {
  const [hidden, setHidden] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('dashboard-hidden-widgets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem('dashboard-hidden-widgets', JSON.stringify(hidden));
  }, [hidden]);
  const toggle = (id: string) => {
    setHidden((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  return [hidden, toggle];
}

// -- Motion: subtle only (fade + 8px slide) --
const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

// ════════════════════════════════════════════════════════════════════
// Home — a calm academic operating-system surface.
//
// Hierarchy: greeting -> Delulu Now -> Today -> Snapshot -> Progress ->
// one quiet next step -> deeper sections.
// ════════════════════════════════════════════════════════════════════
export default function DashboardView() {
  const subjects = useStore((s) => s.subjects);
  const assessments = useStore((s) => s.assessments);
  const studySessions = useStore((s) => s.studySessions);
  const profile = useStore((s) => s.profile);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);

  const { activeSemester, setSelectedSemester, availableSemesters } = useSemesterFilter();
  const intel = useHomeIntel();

  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [hiddenWidgets, toggleWidget] = useHiddenWidgets();

  const cgpa = useMemo(() => calculateCGPA({ subjects, assessments, profile }), [subjects, assessments, profile]);
  const completedCredits = useMemo(
    () => subjects.filter((s) => !s.archived).reduce((sum, s) => sum + s.credits, 0),
    [subjects]
  );

  function handleAction(view: string, subjectId?: string) {
    if (subjectId) selectSubject(subjectId);
    navigate(view as never);
  }

  // -- Streak milestone toast (unchanged) --
  const studyStreak = useMemo(() => getStudyStreak({ studySessions }), [studySessions]);
  const { toast } = useToast();
  const milestoneToastRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const milestones = [3, 7, 14, 21, 30, 60, 90];
    const met = milestones.filter((m) => studyStreak >= m);

    if (milestoneToastRef.current === null) {
      milestoneToastRef.current = new Set(met);
      if (studyStreak >= 100) milestoneToastRef.current.add(100);
      return;
    }

    const titleMap: Record<number, string> = {
      3: '3-day streak started!',
      7: 'One week streak!',
      14: 'Two weeks strong!',
      21: 'Three week streak!',
      30: 'Monthly milestone!',
      60: 'Two months of consistency!',
      90: 'Quarter-year streak!',
    };

    for (const m of met) {
      if (!milestoneToastRef.current.has(m)) {
        milestoneToastRef.current.add(m);
        toast({
          variant: 'success',
          title: titleMap[m] ?? `Incredible ${m}-day streak!`,
          description: 'Keep up the amazing work! Your consistent study habits are paying off.',
        });
      }
    }

    if (studyStreak >= 100 && !milestoneToastRef.current.has(100)) {
      milestoneToastRef.current.add(100);
      toast({
        variant: 'success',
        title: `Incredible ${studyStreak}-day streak!`,
        description: 'Keep up the amazing work! Your consistent study habits are paying off.',
      });
    }
  }, [studyStreak, toast]);

  const semesterTabs = availableSemesters.length > 1 && (
    <div className="flex gap-1 overflow-x-auto scrollbar-none">
      {availableSemesters.map((sem) => (
        <button
          key={sem}
          onClick={() => setSelectedSemester(sem === activeSemester ? null : sem)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            sem === activeSemester ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sem {sem}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          MOBILE — strictly stacked, same reading order
          ══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-8 fab-content-pad">
        <HomeHeader widgets={MOBILE_WIDGETS} hiddenWidgets={hiddenWidgets} onToggleWidget={toggleWidget} />
        {semesterTabs}

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <NowHero />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <AcademicSnapshot />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <ProgressSummary />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <UpcomingTasksSection />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <TodaysSubjectsSection />
        </motion.div>

        {!hiddenWidgets.includes('subject-progress') && (
          <StudyProgressSection items={intel.subjectFlow} limit={4} />
        )}

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <TodaySchedule />
        </motion.div>

        {!hiddenWidgets.includes('insight') && (
          <HomeInsightLine recommendations={intel.recommendations} insights={intel.insights} onOpen={handleAction} />
        )}

        <KnowledgeLine />

        {!hiddenWidgets.includes('quick-actions') && (
          <QuickActionsSection
            onAchievements={() => setAchievementsOpen(true)}
            onQuickNote={() => setQuickNoteOpen(true)}
          />
        )}

        <NEPExitCalculator currentCGPA={cgpa} completedCredits={completedCredits} />
        <SocietiesSection />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP — main column (2fr) + side column (1fr), collapsing to a
          single column below ~1100px.
          ══════════════════════════════════════════════════════════════ */}
      <motion.div className="hidden md:block space-y-10 pb-4" variants={container} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
          <HomeHeader widgets={DESKTOP_WIDGETS} hiddenWidgets={hiddenWidgets} onToggleWidget={toggleWidget} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <NowHero />
        </motion.div>

        <div className="grid grid-cols-1 gap-10 min-[1100px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Main column */}
          <div className="min-w-0 space-y-10">
            <motion.div variants={fadeUp}>
              <AcademicSnapshot />
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 gap-10 min-[1400px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
            >
              <ProgressSummary />
              <UpcomingTasksSection />
            </motion.div>

            <motion.div variants={fadeUp}>
              <TodaysSubjectsSection />
            </motion.div>

            {!hiddenWidgets.includes('academic-flow') && (
              <motion.div variants={fadeUp}>
                <StudyProgressSection items={intel.subjectFlow} />
              </motion.div>
            )}
          </div>

          {/* Side column */}
          <div className="min-w-0 space-y-10">
            <motion.div variants={fadeUp}>
              <TodaySchedule />
            </motion.div>

            {!hiddenWidgets.includes('deadlines') && (
              <motion.div variants={fadeUp}>
                <DeadlinesSection items={intel.deadlines} />
              </motion.div>
            )}
          </div>
        </div>

        <motion.div variants={fadeUp}>
          <HomeInsightLine recommendations={intel.recommendations} insights={intel.insights} onOpen={handleAction} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <KnowledgeLine />
        </motion.div>

        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {!hiddenWidgets.includes('insights') && <InsightsSection items={intel.insights} />}
            {!hiddenWidgets.includes('study-patterns') && <StudyPatternsSection items={intel.patterns} />}
            {!hiddenWidgets.includes('weekly-activity') && <WeeklyActivitySection days={intel.heatDays} />}
            <WeeklyFocusSection slices={intel.focusSlices} />
          </div>

          {!hiddenWidgets.includes('todays-focus') && <RecommendationsSection items={intel.recommendations} />}

          {!hiddenWidgets.includes('quick-actions') && (
            <QuickActionsSection
              onAchievements={() => setAchievementsOpen(true)}
              onQuickNote={() => setQuickNoteOpen(true)}
            />
          )}
        </div>

        <NEPExitCalculator currentCGPA={cgpa} completedCredits={completedCredits} />
        <SocietiesSection />
      </motion.div>

      <AchievementsDialog open={achievementsOpen} onOpenChange={setAchievementsOpen} />
      <QuickNoteDialog open={quickNoteOpen} onOpenChange={setQuickNoteOpen} />
    </>
  );
}
