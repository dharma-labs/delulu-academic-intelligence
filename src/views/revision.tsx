'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Inbox,
} from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';

import { useStore, reviewRevisionItem, getDueRevisionItems } from '@/lib/store';
import type { RevisionItem } from '@/lib/types';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ─── Mastery helpers ─────────────────────────────────────────────
function getMastery(repetitions: number): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
} {
  if (repetitions >= 5) return { label: 'Mastered', variant: 'default' };
  if (repetitions >= 4) return { label: 'Proficient', variant: 'default' };
  if (repetitions >= 3) return { label: 'Familiar', variant: 'secondary' };
  if (repetitions >= 1) return { label: 'Learning', variant: 'outline' };
  return { label: 'New', variant: 'destructive' };
}

type UrgencyLevel = 'high' | 'medium' | 'low';

function getUrgency(nextReview: string): UrgencyLevel {
  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = differenceInDays(parseISO(today), parseISO(nextReview));
  if (daysOverdue > 3) return 'high';
  if (daysOverdue >= 1) return 'medium';
  return 'low';
}

function getUrgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-amber-500';
    case 'low': return 'text-green-500';
  }
}

function getUrgencyBg(level: UrgencyLevel): string {
  switch (level) {
    case 'high': return 'bg-red-500/10 border-red-500/20';
    case 'medium': return 'bg-amber-500/10 border-amber-500/20';
    case 'low': return 'bg-green-500/10 border-green-500/20';
  }
}

// ─── Quality button config ───────────────────────────────────────
const QUALITY_BUTTONS: {
  quality: number;
  label: string;
  color: string;
  hoverColor: string;
}[] = [
  { quality: 1, label: 'Again', color: 'bg-red-500 hover:bg-red-600 text-white', hoverColor: '' },
  { quality: 2, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600 text-white', hoverColor: '' },
  { quality: 3, label: 'Good', color: 'bg-green-500 hover:bg-green-600 text-white', hoverColor: '' },
  { quality: 5, label: 'Easy', color: 'bg-sky-500 hover:bg-sky-600 text-white', hoverColor: '' },
];

// ─── Component ─────────────────────────────────────────────────────
export default function RevisionView() {
  const store = useStore();
  const { subjects, revisionItems } = store;

  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [allItemsOpen, setAllItemsOpen] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  // ─── Derived data ────────────────────────────────────────────────
  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  const today = useMemo(
    () => new Date().toISOString().split('T')[0],
    []
  );

  const dueItems = useMemo(() => {
    const due = revisionItems.filter((r) => r.nextReview <= today);
    const high: RevisionItem[] = [];
    const medium: RevisionItem[] = [];
    const low: RevisionItem[] = [];
    for (const item of due) {
      const urgency = getUrgency(item.nextReview);
      if (urgency === 'high') high.push(item);
      else if (urgency === 'medium') medium.push(item);
      else low.push(item);
    }
    return { all: due, high, medium, low, total: due.length };
  }, [revisionItems, today]);

  const upcomingItems = useMemo(() => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const futureStr = sevenDaysFromNow.toISOString().split('T')[0];
    return revisionItems
      .filter((r) => r.nextReview > today && r.nextReview <= futureStr)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  }, [revisionItems, today]);

  const allFilteredItems = useMemo(() => {
    let items = revisionItems;
    if (subjectFilter !== 'all') {
      items = items.filter((r) => r.subjectId === subjectFilter);
    }
    return items.sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  }, [revisionItems, subjectFilter]);

  // Items remaining to review (not yet reviewed this session)
  const remainingDueItems = useMemo(
    () => dueItems.all.filter((r) => !reviewedIds.has(r.id)),
    [dueItems.all, reviewedIds]
  );

  // ─── Actions ─────────────────────────────────────────────────────
  const handleReview = useCallback((
    itemId: string,
    quality: number
  ) => {
    reviewRevisionItem(store, itemId, quality);
    setReviewedIds((prev) => new Set(prev).add(itemId));
  }, [store]);

  // ─── Helper to get subject ───────────────────────────────────────
  const getSubject = useCallback(
    (subjectId: string) => subjects.find((s) => s.id === subjectId),
    [subjects]
  );

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className='p-4 sm:p-6 space-y-6 max-w-4xl mx-auto'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
          <Brain className='h-6 w-6' />
          Revision
        </h1>
        <p className='mt-1 text-muted-foreground'>
          Spaced repetition to cement your knowledge long-term.
        </p>
      </div>

      {/* ── Summary Bar ──────────────────────────────────────────── */}
      <Card className='p-4 sm:p-6'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
          <div className='flex-1'>
            <p className='text-sm text-muted-foreground'>Due Today</p>
            <p className='text-4xl font-bold tabular-nums'>{dueItems.total}</p>
            <p className='text-sm text-muted-foreground mt-0.5'>topics</p>
          </div>
          <Separator orientation='vertical' className='hidden sm:block h-12' />
          <div className='flex gap-4 sm:gap-6'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-red-500 tabular-nums'>{dueItems.high.length}</p>
              <p className='text-xs text-muted-foreground'>High</p>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-bold text-amber-500 tabular-nums'>{dueItems.medium.length}</p>
              <p className='text-xs text-muted-foreground'>Medium</p>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-500 tabular-nums'>{dueItems.low.length}</p>
              <p className='text-xs text-muted-foreground'>Low</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Due Items ────────────────────────────────────────────── */}
      {remainingDueItems.length > 0 ? (
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-amber-500' />
            Due for Review
            <Badge variant='secondary'>{remainingDueItems.length}</Badge>
          </h2>
          <AnimatePresence>
            {remainingDueItems.map((item) => {
              const subject = getSubject(item.subjectId);
              const urgency = getUrgency(item.nextReview);
              const mastery = getMastery(item.repetitions);
              const daysOverdue = differenceInDays(
                parseISO(today),
                parseISO(item.nextReview)
              );

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                >
                  <Card className={`p-4 border ${getUrgencyBg(urgency)}`}>
                    <div className='flex flex-col sm:flex-row sm:items-start gap-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <h3 className='font-medium'>{item.topicName}</h3>
                          <Badge variant={mastery.variant} className='text-xs'>
                            {mastery.label}
                          </Badge>
                          {urgency === 'high' && (
                            <Badge variant='destructive' className='text-xs'>
                              {Math.abs(daysOverdue)}d overdue
                            </Badge>
                          )}
                        </div>
                        <div className='flex items-center gap-3 mt-1.5 text-sm text-muted-foreground'>
                          {subject && (
                            <span className='flex items-center gap-1'>
                              <span
                                className='h-2 w-2 rounded-full'
                                style={{ backgroundColor: subject.color }}
                              />
                              {subject.name}
                            </span>
                          )}
                          {item.lastReview && (
                            <span className='flex items-center gap-1'>
                              <Calendar className='h-3 w-3' />
                              {format(parseISO(item.lastReview), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quality Buttons */}
                      <div className='flex items-center gap-2 shrink-0'>
                        {QUALITY_BUTTONS.map((btn) => (
                          <Button
                            key={btn.quality}
                            size='sm'
                            className={`${btn.color} h-8 px-3 text-xs font-medium`}
                            onClick={() => handleReview(item.id, btn.quality)}
                          >
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        dueItems.total === 0 && revisionItems.length === 0 ? (
          <Card className='p-8 text-center'>
            <Inbox className='mx-auto h-12 w-12 text-muted-foreground/40' />
            <p className='mt-4 text-lg font-medium'>No revision items yet</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Complete syllabus topics to add them to your revision queue.
            </p>
          </Card>
        ) : reviewedIds.size > 0 && remainingDueItems.length === 0 ? (
          <Card className='p-8 text-center'>
            <CheckCircle2 className='mx-auto h-12 w-12 text-green-500/60' />
            <p className='mt-4 text-lg font-medium'>All caught up!</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              You reviewed {reviewedIds.size} item{reviewedIds.size > 1 ? 's' : ''} this session.
              Great work!
            </p>
          </Card>
        ) : null
      )}

      {/* ── Upcoming Reviews ─────────────────────────────────────── */}
      {upcomingItems.length > 0 && (
        <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              className='w-full justify-between p-0 h-auto hover:bg-transparent'
            >
              <h2 className='text-lg font-semibold flex items-center gap-2'>
                <Clock className='h-5 w-5 text-muted-foreground' />
                Upcoming Reviews
                <Badge variant='secondary'>{upcomingItems.length}</Badge>
              </h2>
              {upcomingOpen ? (
                <ChevronDown className='h-5 w-5 text-muted-foreground' />
              ) : (
                <ChevronRight className='h-5 w-5 text-muted-foreground' />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='mt-3 space-y-2 max-h-96 overflow-y-auto scrollbar-thin'>
              {upcomingItems.map((item) => {
                const subject = getSubject(item.subjectId);
                const mastery = getMastery(item.repetitions);
                const daysUntil = differenceInDays(
                  parseISO(item.nextReview),
                  parseISO(today)
                );

                return (
                  <Card key={item.id} className='flex items-center gap-4 p-3'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate'>{item.topicName}</p>
                      {subject && (
                        <p className='text-xs text-muted-foreground flex items-center gap-1'>
                          <span
                            className='h-1.5 w-1.5 rounded-full'
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </p>
                      )}
                    </div>
                    <Badge variant='outline' className='text-xs shrink-0'>
                      {mastery.label}
                    </Badge>
                    <span className={`text-sm font-medium shrink-0 ${getUrgencyColor('low')}`}>
                      {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                    </span>
                  </Card>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── All Items ────────────────────────────────────────────── */}
      {revisionItems.length > 0 && (
        <Collapsible open={allItemsOpen} onOpenChange={setAllItemsOpen}>
          <div className='flex items-center justify-between'>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                className='justify-between p-0 h-auto hover:bg-transparent'
              >
                <h2 className='text-lg font-semibold flex items-center gap-2'>
                  <BarChart3 className='h-5 w-5 text-muted-foreground' />
                  All Items
                  <Badge variant='secondary'>{revisionItems.length}</Badge>
                </h2>
                {allItemsOpen ? (
                  <ChevronDown className='h-5 w-5 text-muted-foreground' />
                ) : (
                  <ChevronRight className='h-5 w-5 text-muted-foreground' />
                )}
              </Button>
            </CollapsibleTrigger>

            {/* Subject filter */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className='w-[160px] h-8 text-xs'>
                <SelectValue placeholder='Filter subject' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Subjects</SelectItem>
                {activeSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CollapsibleContent>
            <div className='mt-3 space-y-2 max-h-96 overflow-y-auto scrollbar-thin'>
              {allFilteredItems.map((item) => {
                const subject = getSubject(item.subjectId);
                const mastery = getMastery(item.repetitions);
                const daysUntil = differenceInDays(
                  parseISO(item.nextReview),
                  parseISO(today)
                );

                return (
                  <Card key={item.id} className='p-3'>
                    <div className='flex items-center gap-3 flex-wrap'>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>{item.topicName}</p>
                        {subject && (
                          <p className='text-xs text-muted-foreground flex items-center gap-1'>
                            <span
                              className='h-1.5 w-1.5 rounded-full'
                              style={{ backgroundColor: subject.color }}
                            />
                            {subject.name}
                          </p>
                        )}
                      </div>
                      <Badge variant={mastery.variant} className='text-xs'>
                        {mastery.label}
                      </Badge>
                      <div className='text-xs text-muted-foreground space-y-0.5 text-right shrink-0'>
                        <p>
                          Last: {item.lastReview ? format(parseISO(item.lastReview), 'MMM d') : 'Never'}
                        </p>
                        <p>
                          Next:{' '}
                          <span className={daysUntil <= 0 ? getUrgencyColor(getUrgency(item.nextReview)) : ''}>
                            {daysUntil === 0
                              ? 'Today'
                              : daysUntil < 0
                                ? `${Math.abs(daysUntil)}d overdue`
                                : `${daysUntil}d`}
                          </span>
                        </p>
                        <p>EF: {item.easeFactor.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {allFilteredItems.length === 0 && (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  No items match the selected filter.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
