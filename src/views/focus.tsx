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
} from 'lucide-react';

import { useStore } from '@/lib/store';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';

// ─── Constants ─────────────────────────────────────────────────────
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

const TIMER_RADIUS = 140;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

type Phase = 'setup' | 'active' | 'completion';

// ─── Helpers ───────────────────────────────────────────────────────
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

// ─── Component ─────────────────────────────────────────────────────
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

  // ─── Derived data ────────────────────────────────────────────────
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

  // ─── Timer logic ─────────────────────────────────────────────────
  useEffect(() => {
    if (focusActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        useStore.setState({ focusElapsed: elapsedRef.current });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [focusActive, isPaused]);

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

  // ─── Actions ─────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!selectedSubjectId) return;
    const topicName = selectedTopic?.name;
    startFocus(selectedSubjectId, selectedTopicId || undefined, topicName);
    elapsedRef.current = 0;
    setIsPaused(false);
    setPhase('active');
  }, [selectedSubjectId, selectedTopicId, selectedTopic, startFocus]);

  const handlePauseResume = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const handleStopClick = useCallback(() => {
    setShowStopDialog(true);
  }, []);

  const handleConfirmStop = useCallback(() => {
    setShowStopDialog(false);
    const duration = elapsedRef.current;
    stopFocus();
    setCompletionDuration(duration);
    setCompletionTopicName(selectedTopic?.name || '');
    setCompletionNotes('');
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
    // Reset to setup
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
    setPhase('setup');
    setSelectedSubjectId('');
    setSelectedTopicId('');
    setGoalMinutes('');
    setCompletionNotes('');
    setIsPaused(false);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className='relative min-h-full'>
      {/* Subtle background animation when active */}
      <AnimatePresence>
        {focusActive && (
          <motion.div
            className='pointer-events-none fixed inset-0 z-0'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5' />
            <motion.div
              className='absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full'
              style={{
                background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.03, 0.06, 0.03],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className='relative z-10 mx-auto max-w-2xl px-4 py-8 sm:px-6'>
        {/* ── Setup Phase ────────────────────────────────────── */}
        <AnimatePresence mode='wait'>
          {phase === 'setup' && !focusActive && (
            <motion.div
              key='setup'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className='flex flex-col items-center gap-8'
            >
              <div className='text-center'>
                <h1 className='text-3xl font-bold tracking-tight'>Focus Session</h1>
                <p className='mt-2 text-muted-foreground'>
                  Set up your study session and get into deep work mode.
                </p>
              </div>

              <Card className='w-full max-w-md p-6'>
                <div className='space-y-5'>
                  <div className='space-y-2'>
                    <Label htmlFor='subject-select'>Subject</Label>
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
                                className='h-2.5 w-2.5 rounded-full'
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
                      <Label htmlFor='topic-select'>Topic (optional)</Label>
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
                    <Label htmlFor='goal-input'>
                      Session Goal{' '}
                      <span className='text-muted-foreground'>(optional)</span>
                    </Label>
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
                      <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
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
                    <Play className='mr-2 h-5 w-5' />
                    Start Focus
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── Active Timer Phase ────────────────────────────── */}
          {phase === 'active' && focusActive && (
            <motion.div
              key='active'
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className='flex flex-col items-center gap-8'
            >
              {/* Subject & Topic */}
              <div className='text-center'>
                <Badge variant='secondary' className='mb-2'>
                  <BookOpen className='mr-1.5 h-3 w-3' />
                  {selectedSubject?.name || 'Unknown Subject'}
                </Badge>
                {selectedTopic && (
                  <p className='text-sm text-muted-foreground'>{selectedTopic.name}</p>
                )}
              </div>

              {/* Timer Ring */}
              <div className='relative flex items-center justify-center'>
                <svg
                  width={TIMER_RADIUS * 2 + 20}
                  height={TIMER_RADIUS * 2 + 20}
                  className='transform -rotate-90'
                >
                  {/* Background track */}
                  <circle
                    cx={TIMER_RADIUS + 10}
                    cy={TIMER_RADIUS + 10}
                    r={TIMER_RADIUS}
                    fill='none'
                    stroke='var(--color-muted)'
                    strokeWidth='6'
                    opacity='0.3'
                  />
                  {/* Progress arc */}
                  {goalSeconds > 0 && (
                    <motion.circle
                      cx={TIMER_RADIUS + 10}
                      cy={TIMER_RADIUS + 10}
                      r={TIMER_RADIUS}
                      fill='none'
                      stroke='var(--color-primary)'
                      strokeWidth='6'
                      strokeLinecap='round'
                      strokeDasharray={TIMER_CIRCUMFERENCE}
                      strokeDashoffset={strokeDashoffset}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  )}
                </svg>

                {/* Timer text centered inside ring */}
                <div className='absolute flex flex-col items-center'>
                  <motion.span
                    key={focusElapsed}
                    className='text-6xl font-bold tabular-nums tracking-tight'
                    initial={{ scale: 1.02 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.1 }}
                  >
                    {formatElapsed(focusElapsed)}
                  </motion.span>
                  {goalSeconds > 0 && (
                    <span className='mt-1 text-sm text-muted-foreground'>
                      of {formatDuration(goalSeconds)}
                    </span>
                  )}
                </div>

                {/* Pulsing outer glow */}
                {!isPaused && (
                  <motion.div
                    className='absolute h-full w-full rounded-full'
                    style={{
                      border: '2px solid var(--color-primary)',
                    }}
                    animate={{
                      scale: [1, 1.03, 1],
                      opacity: [0.2, 0.05, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </div>

              {/* Motivational text */}
              <motion.p
                key={messageIndex}
                className='text-sm italic text-muted-foreground'
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4 }}
              >
                {MOTIVATIONAL_MESSAGES[messageIndex]}
              </motion.p>

              {/* Controls */}
              <div className='flex items-center gap-4'>
                <Button
                  variant='outline'
                  size='lg'
                  className='h-14 w-14 rounded-full'
                  onClick={handlePauseResume}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? (
                    <Play className='h-6 w-6' />
                  ) : (
                    <Pause className='h-6 w-6' />
                  )}
                </Button>

                <Button
                  variant='destructive'
                  size='lg'
                  className='h-14 w-14 rounded-full'
                  onClick={handleStopClick}
                  aria-label='Stop'
                >
                  <Square className='h-6 w-6' />
                </Button>
              </div>

              {isPaused && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-xs text-muted-foreground'
                >
                  Paused — timer is not running
                </motion.p>
              )}
            </motion.div>
          )}

          {/* ── Completion Phase ──────────────────────────────── */}
          {phase === 'completion' && (
            <motion.div
              key='completion'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className='flex flex-col items-center gap-8'
            >
              <div className='text-center'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10'
                >
                  <CheckCircle2 className='h-8 w-8 text-green-500' />
                </motion.div>
                <h1 className='text-3xl font-bold tracking-tight'>Session Complete</h1>
                <p className='mt-2 text-muted-foreground'>
                  Great work! Here is a summary of your session.
                </p>
              </div>

              <Card className='w-full max-w-md p-6'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Duration</span>
                    <span className='text-lg font-semibold tabular-nums'>
                      {formatDuration(completionDuration)}
                    </span>
                  </div>
                  <Separator />
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Subject</span>
                    <span className='font-medium'>{selectedSubject?.name || 'Unknown'}</span>
                  </div>
                  {completionTopicName && (
                    <>
                      <Separator />
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-muted-foreground'>Topic</span>
                        <span className='font-medium'>{completionTopicName}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className='space-y-2'>
                    <Label htmlFor='completion-notes'>What did you accomplish?</Label>
                    <Textarea
                      id='completion-notes'
                      placeholder='E.g., Completed chapter 3 exercises, reviewed linked list operations...'
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button className='w-full' onClick={handleSaveCompletion}>
                    <CheckCircle2 className='mr-2 h-4 w-4' />
                    Save Session
                  </Button>
                </div>
              </Card>

              <Button
                variant='ghost'
                onClick={handleAnotherSession}
              >
                <RotateCcw className='mr-2 h-4 w-4' />
                Start Another Session
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recent Sessions (always visible) ────────────────── */}
        {todaySessions.length > 0 && phase === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className='mt-12'
          >
            <h2 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
              <Clock className='h-5 w-5 text-muted-foreground' />
              Today&apos;s Sessions
              <Badge variant='secondary' className='ml-1'>
                {todaySessions.length}
              </Badge>
            </h2>
            <div className='space-y-2'>
              {todaySessions.map((session) => {
                const subj = subjects.find((s) => s.id === session.subjectId);
                return (
                  <Card key={session.id} className='flex items-center gap-4 p-4'>
                    <div
                      className='h-10 w-10 shrink-0 rounded-lg flex items-center justify-center'
                      style={{ backgroundColor: subj ? `${subj.color}15` : 'var(--muted)' }}
                    >
                      <BookOpen
                        className='h-5 w-5'
                        style={{ color: subj?.color || 'var(--muted-foreground)' }}
                      />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium'>
                        {subj?.name || 'Unknown'}
                        {session.topicName && (
                          <span className='text-muted-foreground'>
                            {' '}/ {session.topicName}
                          </span>
                        )}
                      </p>
                      {session.notes && (
                        <p className='truncate text-xs text-muted-foreground'>
                          {session.notes}
                        </p>
                      )}
                    </div>
                    <div className='shrink-0 text-right'>
                      <span className='text-sm font-semibold tabular-nums'>
                        {formatDuration(session.duration)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Stop Confirmation Dialog ────────────────────────── */}
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
