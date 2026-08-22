'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Flame,
} from 'lucide-react';

import { useStore, getStudyStreak, getStudyTimeToday } from '@/lib/store';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PageHeader,
  SectionHeader,
  EmptyState,
} from '@/components/shared';

// --- Constants ---
const MOTIVATIONAL_MESSAGES = [
  'Stay focused...',
  'You are making progress...',
  'Deep work leads to mastery...',
  'One step at a time...',
  'Your future self will thank you...',
  'Consistency beats intensity...',
  'Keep going, you have got this...',
  'Focus is a superpower...',
];

const TIMER_RADIUS = 130;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

const MOBILE_TIMER_RADIUS = 130;
const MOBILE_TIMER_CIRCUMFERENCE = 2 * Math.PI * MOBILE_TIMER_RADIUS;

const TIMER_PRESETS = [
  { minutes: 15, label: '15m', name: 'Quick' },
  { minutes: 25, label: '25m', name: 'Pomodoro' },
  { minutes: 45, label: '45m', name: 'Extended' },
  { minutes: 60, label: '60m', name: 'Deep Work' },
] as const;

type Phase = 'setup' | 'active' | 'completion';

// --- Helpers ---
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

// --- Component ---
export default function FocusView() {
  const {
    subjects,
    syllabusUnits,
    studySessions,
    focusActive,
    focusSubjectId,
    focusElapsed,
    startFocus,
    stopFocus,
    addStudySession,
  } = useStore();

  // Local state
  const [phase, setPhase] = useState<Phase>(() => (focusActive ? 'active' : 'setup'));
  const [selectedSubjectId, setSelectedSubjectId] = useState(focusSubjectId || '');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [goalMinutes, setGoalMinutes] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionDuration, setCompletionDuration] = useState(0);
  const [completionTopicName, setCompletionTopicName] = useState('');
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const [completedNaturally, setCompletedNaturally] = useState(false);
  const [timerPulse, setTimerPulse] = useState(false);
  const completionToastShownRef = useRef(false);
  const naturalCompletionTriggeredRef = useRef(false);

  const { toast } = useToast();

  // --- Derived data ---
  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  const topicsForSubject = useMemo(() => {
    if (!selectedSubjectId) return [];
    const units = syllabusUnits.filter((u) => u.subjectId === selectedSubjectId);
    return units
      .sort((a, b) => a.order - b.order)
      .flatMap((u) =>
        u.topics
          .sort((a, b) => a.order - b.order)
          .map((t) => ({ id: t.id, name: t.name }))
      );
  }, [selectedSubjectId, syllabusUnits]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );

  const selectedTopic = useMemo(
    () => topicsForSubject.find((t) => t.id === selectedTopicId),
    [topicsForSubject, selectedTopicId]
  );

  const todaySessions = useMemo(() => {
    const today = todayDateStr();
    return studySessions
      .filter((s) => s.date === today)
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [studySessions]);

  const todayTotalMinutes = useMemo(
    () => Math.round(todaySessions.reduce((acc, s) => acc + s.duration, 0) / 60),
    [todaySessions]
  );

  const sessionStats = useMemo(() => {
    if (todaySessions.length === 0) return null;
    const durations = todaySessions.map((s) => s.duration);
    const totalSecs = durations.reduce((a, b) => a + b, 0);
    const totalMin = Math.round(totalSecs / 60);
    const h = Math.floor(totalMin / 60);
    const rm = totalMin % 60;
    const totalFormatted = h > 0 ? `${h}h ${rm}m` : `${rm}m`;
    const avgMin = Math.round(totalSecs / durations.length / 60);
    const bestMin = Math.round(Math.max(...durations) / 60);
    return {
      totalFormatted,
      avgMin: `${avgMin}m`,
      bestMin: `${bestMin}m`,
      count: todaySessions.length,
    };
  }, [todaySessions]);

  const studyStreak = useMemo(() => getStudyStreak({ studySessions }), [studySessions]);
  const studyTimeTodaySeconds = useMemo(() => getStudyTimeToday({ studySessions }), [studySessions]);
  const studyTimeTodayFormatted = useMemo(() => formatDuration(studyTimeTodaySeconds), [studyTimeTodaySeconds]);

  // --- Timer logic ---
  useEffect(() => {
    if (focusActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        useStore.setState({ focusElapsed: elapsedRef.current });

        // Check for goal completion
        const goalSecs = goalMinutes ? parseInt(goalMinutes) * 60 : 0;
        if (goalSecs > 0 && elapsedRef.current >= goalSecs && !naturalCompletionTriggeredRef.current) {
          naturalCompletionTriggeredRef.current = true;
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          const finalDuration = elapsedRef.current;
          const topicName = selectedTopic?.name || '';
          // Defer UI state updates to next tick
          setTimeout(() => {
            setTimerPulse(true);
            setTimeout(() => {
              if (phaseRef.current !== 'active') return;
              stopFocus();
              setCompletionDuration(finalDuration);
              setCompletionTopicName(topicName);
              setCompletionNotes('');
              setCompletedNaturally(true);
              setPhase('completion');
              setTimerPulse(false);
            }, 500);
          }, 0);
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [focusActive, isPaused, goalMinutes, stopFocus, selectedTopic]);

  // Motivational message cycling
  useEffect(() => {
    if (!focusActive) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MOTIVATIONAL_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [focusActive]);

  // Progress ring calculation
  const goalSeconds = goalMinutes ? parseInt(goalMinutes) * 60 : 0;
  const progress = goalSeconds > 0
    ? Math.min(focusElapsed / goalSeconds, 1)
    : 0;
  const strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - progress);
  const mobileStrokeDashoffset = MOBILE_TIMER_CIRCUMFERENCE * (1 - progress);

  // Toast notification on completion
  useEffect(() => {
    if (phase !== 'completion' || completionToastShownRef.current) return;
    completionToastShownRef.current = true;

    if (completedNaturally) {
      const parts = [selectedSubject?.name, completionTopicName].filter(Boolean);
      toast({
        variant: 'success',
        title: 'Focus session complete!',
        description: parts.length > 0
          ? `${parts.join(' · ')} · ${formatDuration(completionDuration)}`
          : formatDuration(completionDuration),
      });
    } else {
      const goalMins = goalMinutes ? parseInt(goalMinutes) : 0;
      toast({
        variant: 'default',
        title: 'Session ended early',
        description: goalMins > 0
          ? `Studied ${formatDuration(completionDuration)} of ${goalMins}m goal`
          : `Studied for ${formatDuration(completionDuration)}`,
      });
    }
  }, [phase, completedNaturally, selectedSubject, completionTopicName, completionDuration, goalMinutes, toast]);

  // --- Actions ---
  const handleStart = useCallback(() => {
    if (!selectedSubjectId) return;
    const topicName = selectedTopic?.name;
    startFocus(selectedSubjectId, selectedTopicId || undefined, topicName);
    elapsedRef.current = 0;
    setIsPaused(false);
    setPhase('active');
    setCompletedNaturally(false);
    setTimerPulse(false);
    completionToastShownRef.current = false;
    naturalCompletionTriggeredRef.current = false;
  }, [selectedSubjectId, selectedTopicId, selectedTopic, startFocus]);

  const handlePauseResume = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const handleStopClick = useCallback(() => {
    setShowStopDialog(true);
  }, []);

  const handleConfirmStop = useCallback(() => {
    setShowStopDialog(false);
    if (naturalCompletionTriggeredRef.current) return;
    const duration = elapsedRef.current;
    stopFocus();
    setCompletionDuration(duration);
    setCompletionTopicName(selectedTopic?.name || '');
    setCompletionNotes('');
    setCompletedNaturally(false);
    setPhase('completion');
  }, [stopFocus, selectedTopic]);

  const handleSaveCompletion = useCallback(() => {
    addStudySession({
      subjectId: selectedSubjectId,
      topicId: selectedTopicId || undefined,
      topicName: selectedTopic?.name,
      duration: completionDuration,
      date: todayDateStr(),
      type: 'focus',
      notes: completionNotes || undefined,
    });
    setCompletedNaturally(false);
    completionToastShownRef.current = false;
    naturalCompletionTriggeredRef.current = false;
    setPhase('setup');
    setSelectedSubjectId('');
    setSelectedTopicId('');
    setGoalMinutes('');
    setCompletionNotes('');
    setIsPaused(false);
  }, [
    selectedSubjectId, selectedTopicId, selectedTopic,
    completionDuration, completionNotes, addStudySession,
  ]);

  const handleAnotherSession = useCallback(() => {
    setCompletedNaturally(false);
    completionToastShownRef.current = false;
    naturalCompletionTriggeredRef.current = false;
    setPhase('setup');
    setSelectedSubjectId('');
    setSelectedTopicId('');
    setGoalMinutes('');
    setCompletionNotes('');
    setIsPaused(false);
  }, []);

  // Keyboard shortcuts during active phase
  useEffect(() => {
    if (phase !== 'active') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handlePauseResume();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        handleStopClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handlePauseResume, handleStopClick]);

  // --- Render ---
  return (
    <div className='relative min-h-full'>
      {/* ═══════════════════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════════════════ */}
      <div className='md:hidden'>
        <AnimatePresence mode='wait'>
          {/* --- Mobile: Setup Phase --- */}
          {phase === 'setup' && !focusActive && (
            <motion.div
              key='mobile-setup'
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className='flex flex-col gap-4'
            >
                <div className='w-full metric-card p-2.5 flex items-center justify-center gap-2'>
                  {TIMER_PRESETS.map((preset) => {
                    const isActive = goalMinutes === String(preset.minutes);
                    return (
                      <button
                        key={preset.minutes}
                        onClick={() => setGoalMinutes(String(preset.minutes))}
                        className={cn(
                          'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <span className='text-xs font-semibold tabular-nums leading-none'>{preset.label}</span>
                        <span className={cn('text-[10px] uppercase tracking-wider leading-none', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

              {/* Compact inline session start */}
              <div className='flex flex-wrap gap-2 items-end'>
                <div className='flex-1 min-w-[120px]'>
                  <span className='section-label text-[10px]'>Subject</span>
                  <Select
                    value={selectedSubjectId}
                    onValueChange={(v) => {
                      setSelectedSubjectId(v);
                      setSelectedTopicId('');
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder='Subject' />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className='flex items-center gap-1.5'>
                            <span className='status-dot' style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedSubjectId && topicsForSubject.length > 0 && (
                  <div className='flex-1 min-w-[100px]'>
                    <span className='section-label text-[10px]'>Topic</span>
                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                      <SelectTrigger className='h-8 text-xs'>
                        <SelectValue placeholder='Topic' />
                      </SelectTrigger>
                      <SelectContent>
                        {topicsForSubject.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className='w-[60px]'>
                  <span className='section-label text-[10px]'>Min</span>
                  <Input
                    type='number'
                    min='1'
                    max='480'
                    placeholder='25'
                    value={goalMinutes}
                    onChange={(e) => setGoalMinutes(e.target.value)}
                    className='h-8 text-xs'
                  />
                </div>
                <Button
                  size='sm'
                  disabled={!selectedSubjectId}
                  onClick={handleStart}
                  className='h-8 px-3'
                >
                  <Play className='mr-1 h-3 w-3' />
                  Start
                </Button>
              </div>

              {/* Today's Sessions — compact horizontal strip */}
              {todaySessions.length > 0 && (
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='section-label'>Today</span>
                    <span className='text-[10px] text-muted-foreground tabular-nums'>{todayTotalMinutes}m</span>
                  </div>
                  <div className='flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none snap-x snap-mandatory'>
                    {todaySessions.slice(0, 6).map((session) => {
                      const subj = subjects.find((s) => s.id === session.subjectId);
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className='metric-card flex-shrink-0 w-[120px] snap-start p-2.5'
                        >
                          <div className='flex items-center gap-1.5 mb-1.5'>
                            <span
                              className='status-dot'
                              style={{ backgroundColor: subj?.color || 'var(--muted-foreground)' }}
                            />
                            <span className='text-[11px] font-medium truncate'>
                              {subj?.name || 'Unknown'}
                            </span>
                          </div>
                          <span className='text-sm font-semibold tabular-nums'>
                            {formatDuration(session.duration)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Session Stats — mobile */}
              {sessionStats && (
                <div className='grid grid-cols-2 gap-2'>
                  <div className='metric-card p-2.5'>
                    <span className='metric-label text-[9px] block'>Today's Total</span>
                    <span className='text-sm font-semibold tabular-nums'>{sessionStats.totalFormatted}</span>
                  </div>
                  <div className='metric-card p-2.5'>
                    <span className='metric-label text-[9px] block'>Avg Session</span>
                    <span className='text-sm font-semibold tabular-nums'>{sessionStats.avgMin}</span>
                  </div>
                  <div className='metric-card p-2.5'>
                    <span className='metric-label text-[9px] block'>Best Session</span>
                    <span className='text-sm font-semibold tabular-nums'>{sessionStats.bestMin}</span>
                  </div>
                  <div className='metric-card p-2.5'>
                    <span className='metric-label text-[9px] block'>Sessions</span>
                    <span className='text-sm font-semibold tabular-nums'>{sessionStats.count}</span>
                  </div>
                </div>
              )}

              {todaySessions.length === 0 && (
                <EmptyState
                  icon={Clock}
                  title='No sessions today'
                  description='Tap Start above to begin your first focus session.'
                />
              )}
            </motion.div>
          )}

          {/* --- Mobile: Active Timer Phase --- */}
          {phase === 'active' && focusActive && (
            <motion.div
              key='mobile-active'
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className='flex flex-col items-center gap-4'
            >
              {/* Timer digits centered */}
              <div className='text-center'>
                <motion.span
                  key={focusElapsed}
                  className={cn(
                    'text-5xl font-bold tracking-tighter leading-none tabular-nums',
                    !isPaused && 'animate-timer-pulse'
                  )}
                  initial={{ scale: 1.01 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  {formatElapsed(focusElapsed)}
                </motion.span>
                {/* Status badge + session count */}
                <div className='flex items-center justify-center gap-2 mt-2'>
                  <span className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase',
                    isPaused
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  )}>
                    {isPaused ? 'PAUSED' : 'RUNNING'}
                  </span>
                  {todaySessions.length > 0 && (
                    <span className='text-[10px] text-muted-foreground'>
                      Session {todaySessions.length + 1}
                    </span>
                  )}
                </div>
              </div>

              {/* Timer Ring — full width, larger */}
              <div className={cn('relative flex items-center justify-center w-full max-w-[300px]', timerPulse && 'timer-completion-pulse')}>
                <svg
                  width={MOBILE_TIMER_RADIUS * 2 + 24}
                  height={MOBILE_TIMER_RADIUS * 2 + 24}
                  className={cn('transform -rotate-90', !isPaused && 'timer-glow')}
                >
                  <circle
                    cx={MOBILE_TIMER_RADIUS + 12}
                    cy={MOBILE_TIMER_RADIUS + 12}
                    r={MOBILE_TIMER_RADIUS}
                    fill='none'
                    stroke='var(--border)'
                    strokeWidth='4'
                  />
                  {goalSeconds > 0 && (
                    <motion.circle
                      cx={MOBILE_TIMER_RADIUS + 12}
                      cy={MOBILE_TIMER_RADIUS + 12}
                      r={MOBILE_TIMER_RADIUS}
                      fill='none'
                      stroke='var(--color-primary)'
                      strokeWidth='4'
                      strokeLinecap='round'
                      strokeDasharray={MOBILE_TIMER_CIRCUMFERENCE}
                      strokeDashoffset={mobileStrokeDashoffset}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  )}
                  {goalSeconds === 0 && (
                    <circle
                      cx={MOBILE_TIMER_RADIUS + 12}
                      cy={MOBILE_TIMER_RADIUS + 12}
                      r={MOBILE_TIMER_RADIUS - 8}
                      fill='none'
                      stroke='var(--border)'
                      strokeWidth='1'
                      strokeDasharray='4 8'
                      opacity='0.5'
                    />
                  )}
                </svg>
              </div>

              {/* Topic display */}
              {(selectedSubject || selectedTopic) && (
                <p className='text-xs text-muted-foreground text-center'>
                  {selectedSubject?.name || 'Unknown Subject'}
                  {selectedTopic && <span> · {selectedTopic.name}</span>}
                </p>
              )}

              {/* Controls — large circular buttons */}
              <div className='flex items-center gap-6 mt-2'>
                <div className='flex flex-col items-center gap-1'>
                  <button
                    onClick={handlePauseResume}
                    aria-label={isPaused ? 'Resume' : 'Pause'}
                    className='h-14 w-14 rounded-full border border-border bg-card flex items-center justify-center hover:border-primary/30 transition-colors'
                  >
                    {isPaused ? (
                      <Play className='h-5 w-5 text-foreground' />
                    ) : (
                      <Pause className='h-5 w-5 text-foreground' />
                    )}
                  </button>
                  <span className='text-xs text-muted-foreground'>{isPaused ? 'Resume' : 'Pause'}</span>
                </div>
                <div className='flex flex-col items-center gap-1'>
                  <button
                    onClick={handleStopClick}
                    aria-label='Stop'
                    className='h-14 w-14 rounded-full border border-red-200 dark:border-red-900/50 bg-card flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800/50 transition-colors'
                  >
                    <Square className='h-5 w-5 text-red-500' />
                  </button>
                  <span className='text-xs text-muted-foreground'>Stop</span>
                </div>
              </div>

              {/* Motivational text */}
              {!isPaused && (
                <motion.p
                  key={messageIndex}
                  className='text-xs text-muted-foreground'
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35 }}
                >
                  {MOTIVATIONAL_MESSAGES[messageIndex]}
                </motion.p>
              )}

              {/* Today's Sessions — compact horizontal scroll strip */}
              {todaySessions.length > 0 && (
                <div className='w-full mt-2'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='section-label'>Today's Sessions</span>
                    <span className='text-[10px] text-muted-foreground tabular-nums'>{todayTotalMinutes}m total</span>
                  </div>
                  <div className='flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none snap-x snap-mandatory'>
                    {todaySessions.slice(0, 6).map((session) => {
                      const subj = subjects.find((s) => s.id === session.subjectId);
                      return (
                        <div
                          key={session.id}
                          className='metric-card flex-shrink-0 w-[120px] snap-start p-2.5'
                        >
                          <div className='flex items-center gap-1.5 mb-1.5'>
                            <span
                              className='status-dot'
                              style={{ backgroundColor: subj?.color || 'var(--muted-foreground)' }}
                            />
                            <span className='text-[11px] font-medium truncate'>
                              {subj?.name || 'Unknown'}
                            </span>
                          </div>
                          <span className='text-sm font-semibold tabular-nums'>
                            {formatDuration(session.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* --- Mobile: Completion Phase --- */}
          {phase === 'completion' && (
            <motion.div
              key='mobile-completion'
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className='flex flex-col items-center gap-5'
            >
              <div className='text-center'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40'
                >
                  <CheckCircle2 className='h-6 w-6 text-emerald-500' />
                </motion.div>
                <h1 className='text-lg font-semibold tracking-tight text-foreground'>Session Complete</h1>
                <span className='metric-value tabular-nums text-2xl mt-1 block'>
                  {formatDuration(completionDuration)}
                </span>

                {/* Session Stats */}
                <div className='grid grid-cols-3 gap-3 mt-3'>
                  <div className='text-center'>
                    <span className='text-xs font-bold tabular-nums'>{todaySessions.length}</span>
                    <p className='metric-label text-[9px]'>Sessions</p>
                  </div>
                  <div className='text-center'>
                    <span className='text-xs font-bold tabular-nums'>{studyTimeTodayFormatted}</span>
                    <p className='metric-label text-[9px]'>Time</p>
                  </div>
                  <div className='text-center'>
                    <span className='flex items-center justify-center gap-0.5'>
                      <Flame className='h-3 w-3 text-amber-500' />
                      <span className='text-xs font-bold tabular-nums'>{studyStreak}</span>
                    </span>
                    <p className='metric-label text-[9px]'>Streak</p>
                  </div>
                </div>
              </div>

              <div className='w-full metric-card p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='metric-label'>Subject</span>
                  <div className='flex items-center gap-1.5'>
                    {selectedSubject && (
                      <span className='status-dot' style={{ backgroundColor: selectedSubject.color }} />
                    )}
                    <span className='text-sm font-medium'>{selectedSubject?.name || 'Unknown'}</span>
                  </div>
                </div>
                {completionTopicName && (
                  <div className='flex items-center justify-between'>
                    <span className='metric-label'>Topic</span>
                    <span className='text-sm font-medium'>{completionTopicName}</span>
                  </div>
                )}
              </div>

              <div className='w-full space-y-2'>
                <Label className='section-label' htmlFor='mobile-completion-notes'>
                  What did you accomplish?
                </Label>
                <Textarea
                  id='mobile-completion-notes'
                  placeholder='E.g., Completed chapter 3 exercises...'
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={2}
                  className='resize-none text-sm'
                />
              </div>

              <Button className='w-full' onClick={handleSaveCompletion}>
                <CheckCircle2 className='mr-2 h-4 w-4' />
                Save Session
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={handleAnotherSession}
                className='text-muted-foreground'
              >
                <RotateCcw className='mr-2 h-3.5 w-3.5' />
                Start Another
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP LAYOUT (unchanged)
          ═══════════════════════════════════════════════════════════════ */}
      <div className='hidden md:block'>
        <div className='content-area px-4 sm:px-6 py-6'>
          <AnimatePresence mode='wait'>
            {/* --- Setup Phase --- */}
            {phase === 'setup' && !focusActive && (
              <motion.div
                key='setup'
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className='flex flex-col items-center gap-8'
              >
                <PageHeader
                  title='Focus Session'
                  subtitle='Set up your study session and get into deep work mode.'
                  badge={
                    todaySessions.length > 0 ? (
                      <span className='section-label'>{todaySessions.length} sessions today</span>
                    ) : undefined
                  }
                  className='!mb-0 w-full max-w-md'
                />

                <div className='w-full max-w-md'>
                  <div className='metric-card p-5 space-y-5'>
                    <div className='space-y-2'>
                      <Label className='section-label' htmlFor='subject-select'>Subject</Label>
                      <Select
                        value={selectedSubjectId}
                        onValueChange={(v) => {
                          setSelectedSubjectId(v);
                          setSelectedTopicId('');
                        }}
                      >
                        <SelectTrigger id='subject-select'>
                          <SelectValue placeholder='Select a subject' />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSubjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className='flex items-center gap-2'>
                                <span
                                  className='status-dot'
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSubjectId && topicsForSubject.length > 0 && (
                      <motion.div
                        className='space-y-2'
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Label className='section-label' htmlFor='topic-select'>Topic (optional)</Label>
                        <Select
                          value={selectedTopicId}
                          onValueChange={setSelectedTopicId}
                        >
                          <SelectTrigger id='topic-select'>
                            <SelectValue placeholder='Select a topic' />
                          </SelectTrigger>
                          <SelectContent>
                            {topicsForSubject.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}

                    <div className='space-y-2'>
                      <Label className='section-label' htmlFor='goal-input'>
                        Session Goal
                        <span className='font-normal normal-case tracking-normal text-muted-foreground/60 ml-1'>(optional)</span>
                      </Label>
                      <div className='metric-card p-2 flex items-center justify-center gap-2'>
                        {TIMER_PRESETS.map((preset) => {
                          const isActive = goalMinutes === String(preset.minutes);
                          return (
                            <button
                              key={preset.minutes}
                              onClick={() => setGoalMinutes(String(preset.minutes))}
                              className={cn(
                                'flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-full transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                              )}
                            >
                              <span className='text-xs font-semibold tabular-nums leading-none'>{preset.label}</span>
                              <span className={cn('text-[10px] uppercase tracking-wider leading-none', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
                                {preset.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className='relative'>
                        <Input
                          id='goal-input'
                          type='number'
                          min='1'
                          max='480'
                          placeholder='e.g. 45'
                          value={goalMinutes}
                          onChange={(e) => setGoalMinutes(e.target.value)}
                          className='pr-16'
                        />
                        <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground'>
                          minutes
                        </span>
                      </div>
                    </div>

                    <Button
                      size='lg'
                      className='w-full'
                      disabled={!selectedSubjectId}
                      onClick={handleStart}
                    >
                      <Play className='mr-2 h-4 w-4' />
                      Start Focus
                    </Button>
                  </div>
                </div>

                {/* --- Recent Sessions --- */}
                {todaySessions.length > 0 && (
                  <div className='w-full max-w-md mt-2'>
                    <SectionHeader
                      title="Today's Sessions"
                      subtitle={`${todayTotalMinutes}m total study time`}
                    />
                    <div className='space-y-2'>
                      {todaySessions.map((session) => {
                        const subj = subjects.find((s) => s.id === session.subjectId);
                        return (
                          <div
                            key={session.id}
                            className='card-interactive flex items-center gap-3 p-3'
                          >
                            <div
                              className='h-8 w-8 shrink-0 rounded-md flex items-center justify-center'
                              style={{ backgroundColor: subj ? `${subj.color}12` : undefined }}
                            >
                              <BookOpen
                                className='h-4 w-4'
                                style={{ color: subj?.color || 'var(--muted-foreground)' }}
                              />
                            </div>
                            <div className='min-w-0 flex-1'>
                              <p className='text-sm font-medium truncate'>
                                {subj?.name || 'Unknown'}
                                {session.topicName && (
                                  <span className='text-muted-foreground font-normal'>
                                    {' '}/ {session.topicName}
                                  </span>
                                )}
                              </p>
                              {session.notes && (
                                <p className='text-[11px] text-muted-foreground truncate'>
                                  {session.notes}
                                </p>
                              )}
                            </div>
                            <span className='text-sm font-semibold tabular-nums text-muted-foreground shrink-0'>
                              {formatDuration(session.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Session Stats — desktop */}
                    {sessionStats && (
                      <div className='mt-4'>
                        <span className='section-label block mb-2'>Session Stats</span>
                        <div className='grid grid-cols-4 gap-2'>
                          <div className='metric-card p-3 text-center'>
                            <span className='metric-label text-[9px] block'>Today's Total</span>
                            <span className='text-sm font-semibold tabular-nums mt-1 block'>{sessionStats.totalFormatted}</span>
                          </div>
                          <div className='metric-card p-3 text-center'>
                            <span className='metric-label text-[9px] block'>Avg Session</span>
                            <span className='text-sm font-semibold tabular-nums mt-1 block'>{sessionStats.avgMin}</span>
                          </div>
                          <div className='metric-card p-3 text-center'>
                            <span className='metric-label text-[9px] block'>Best Session</span>
                            <span className='text-sm font-semibold tabular-nums mt-1 block'>{sessionStats.bestMin}</span>
                          </div>
                          <div className='metric-card p-3 text-center'>
                            <span className='metric-label text-[9px] block'>Sessions</span>
                            <span className='text-sm font-semibold tabular-nums mt-1 block'>{sessionStats.count}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {todaySessions.length === 0 && (
                  <EmptyState
                    icon={Clock}
                    title='No sessions today'
                    description='Start your first focus session to begin tracking study time.'
                  />
                )}
              </motion.div>
            )}

            {/* --- Active Timer Phase --- */}
            {phase === 'active' && focusActive && (
              <motion.div
                key='active'
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className='flex flex-col items-center gap-6'
              >
                {/* Subject & Topic */}
                <div className='text-center'>
                  <div className='flex items-center justify-center gap-2 mb-1'>
                    {selectedSubject && (
                      <span
                        className='status-dot'
                        style={{ backgroundColor: selectedSubject.color }}
                      />
                    )}
                    <span className='text-sm font-medium'>
                      {selectedSubject?.name || 'Unknown Subject'}
                    </span>
                  </div>
                  {selectedTopic && (
                    <p className='text-xs text-muted-foreground'>{selectedTopic.name}</p>
                  )}
                </div>

                {/* Timer Ring */}
                <div className={cn('relative flex items-center justify-center', timerPulse && 'timer-completion-pulse')}>
                  <svg
                    width={TIMER_RADIUS * 2 + 24}
                    height={TIMER_RADIUS * 2 + 24}
                    className={cn('transform -rotate-90', !isPaused && 'timer-glow')}
                  >
                    {/* Background track */}
                    <circle
                      cx={TIMER_RADIUS + 12}
                      cy={TIMER_RADIUS + 12}
                      r={TIMER_RADIUS}
                      fill='none'
                      stroke='var(--border)'
                      strokeWidth='3'
                    />
                    {/* Progress arc */}
                    {goalSeconds > 0 && (
                      <motion.circle
                        cx={TIMER_RADIUS + 12}
                        cy={TIMER_RADIUS + 12}
                        r={TIMER_RADIUS}
                        fill='none'
                        stroke='var(--color-primary)'
                        strokeWidth='3'
                        strokeLinecap='round'
                        strokeDasharray={TIMER_CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    )}
                    {/* No-goal: subtle inner ring */}
                    {goalSeconds === 0 && (
                      <circle
                        cx={TIMER_RADIUS + 12}
                        cy={TIMER_RADIUS + 12}
                        r={TIMER_RADIUS - 8}
                        fill='none'
                        stroke='var(--border)'
                        strokeWidth='1'
                        strokeDasharray='4 8'
                        opacity='0.5'
                      />
                    )}
                  </svg>

                  {/* Timer text centered inside ring */}
                  <div className='absolute flex flex-col items-center'>
                    <motion.span
                      key={focusElapsed}
                      className={cn('text-4xl md:text-5xl font-bold tracking-tighter leading-none tabular-nums', !isPaused && 'animate-timer-pulse')}
                      initial={{ scale: 1.01 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.1 }}
                    >
                      {formatElapsed(focusElapsed)}
                    </motion.span>
                    {goalSeconds > 0 && (
                      <span className='text-xs text-muted-foreground mt-1'>
                        of {formatDuration(goalSeconds)}
                      </span>
                    )}
                    {isPaused && (
                      <span className='text-[10px] font-medium text-amber-500 uppercase tracking-wider mt-2'>
                        Paused
                      </span>
                    )}
                  </div>
                </div>

                {/* Motivational text */}
                {!isPaused && (
                  <motion.p
                    key={messageIndex}
                    className='text-xs text-muted-foreground'
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.35 }}
                  >
                    {MOTIVATIONAL_MESSAGES[messageIndex]}
                  </motion.p>
                )}

                {/* Controls */}
                <div className='flex items-center gap-3'>
                  <button
                    onClick={handlePauseResume}
                    aria-label={isPaused ? 'Resume' : 'Pause'}
                    className='h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center hover:border-primary/30 transition-colors'
                  >
                    {isPaused ? (
                      <Play className='h-5 w-5 text-foreground' />
                    ) : (
                      <Pause className='h-5 w-5 text-foreground' />
                    )}
                  </button>

                  <button
                    onClick={handleStopClick}
                    aria-label='Stop'
                    className='h-12 w-12 rounded-full border border-red-200 dark:border-red-900/50 bg-card flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800/50 transition-colors'
                  >
                    <Square className='h-4 w-4 text-red-500' />
                  </button>
                </div>

                {/* Keyboard shortcuts hint — desktop only */}
                <p className='hidden md:block text-[10px] text-muted-foreground tracking-wider uppercase'>
                  Space: Pause/Resume · Esc: Stop
                </p>
              </motion.div>
            )}

            {/* --- Completion Phase --- */}
            {phase === 'completion' && (
              <motion.div
                key='completion'
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className='flex flex-col items-center gap-8'
              >
                <div className='text-center'>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40'
                  >
                    <CheckCircle2 className='h-7 w-7 text-emerald-500' />
                  </motion.div>
                  <h1 className='text-xl font-semibold tracking-tight text-foreground'>Session Complete</h1>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Great work! Here is a summary of your session.
                  </p>
                </div>

                <div className='w-full max-w-md'>
                  <div className='metric-card p-5 space-y-4'>
                    {/* Duration highlight */}
                    <div className='text-center py-3'>
                      <span className='metric-value tabular-nums'>
                        {formatDuration(completionDuration)}
                      </span>
                      <p className='metric-context'>Session Duration</p>
                    </div>

                    {/* Session Stats */}
                    <div className='grid grid-cols-3 gap-3 border-t border-border pt-3'>
                      <div className='text-center'>
                        <span className='text-sm font-bold tabular-nums'>{todaySessions.length}</span>
                        <p className='metric-label'>Sessions Today</p>
                      </div>
                      <div className='text-center'>
                        <span className='text-sm font-bold tabular-nums'>{studyTimeTodayFormatted}</span>
                        <p className='metric-label'>Time Today</p>
                      </div>
                      <div className='text-center'>
                        <span className='flex items-center justify-center gap-1'>
                          <Flame className='h-3.5 w-3.5 text-amber-500' />
                          <span className='text-sm font-bold tabular-nums'>{studyStreak}</span>
                        </span>
                        <p className='metric-label'>Day Streak</p>
                      </div>
                    </div>

                    {/* Subject & Topic */}
                    <div className='space-y-2 border-t border-border pt-3'>
                      <div className='flex items-center justify-between'>
                        <span className='metric-label'>Subject</span>
                        <div className='flex items-center gap-1.5'>
                          {selectedSubject && (
                            <span
                              className='status-dot'
                              style={{ backgroundColor: selectedSubject.color }}
                            />
                          )}
                          <span className='text-sm font-medium'>
                            {selectedSubject?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      {completionTopicName && (
                        <div className='flex items-center justify-between'>
                          <span className='metric-label'>Topic</span>
                          <span className='text-sm font-medium'>{completionTopicName}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className='space-y-2 border-t border-border pt-3'>
                      <Label className='section-label' htmlFor='completion-notes'>
                        What did you accomplish?
                      </Label>
                      <Textarea
                        id='completion-notes'
                        placeholder='E.g., Completed chapter 3 exercises, reviewed linked list operations...'
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        rows={3}
                        className='resize-none'
                      />
                    </div>

                    <Button className='w-full' onClick={handleSaveCompletion}>
                      <CheckCircle2 className='mr-2 h-4 w-4' />
                      Save Session
                    </Button>
                  </div>
                </div>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleAnotherSession}
                  className='text-muted-foreground'
                >
                  <RotateCcw className='mr-2 h-3.5 w-3.5' />
                  Start Another Session
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- Stop Confirmation Dialog --- */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Focus Session?</AlertDialogTitle>
            <AlertDialogDescription>
              You have been studying for {formatElapsed(focusElapsed)}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Studying</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStop}>
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
