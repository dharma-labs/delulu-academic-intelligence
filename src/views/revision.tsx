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
  Inbox,
  BarChart3,
} from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';

import { useStore, reviewRevisionItem, getDueRevisionItems } from '@/lib/store';
import type { RevisionItem } from '@/lib/types';

import { Button } from '@/components/ui/button';
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
import {
  PageHeader,
  MetricCard,
  StatusBadge,
  SectionHeader,
  EmptyState,
} from '@/components/shared';

// --- Mastery helpers ---
function getMasteryStatus(repetitions: number): {
  label: string;
  status: 'critical' | 'attention' | 'improving' | 'healthy' | 'healthy';
} {
  if (repetitions >= 5) return { label: 'Mastered', status: 'healthy' };
  if (repetitions >= 4) return { label: 'Proficient', status: 'healthy' };
  if (repetitions >= 3) return { label: 'Familiar', status: 'improving' };
  if (repetitions >= 1) return { label: 'Learning', status: 'attention' };
  return { label: 'New', status: 'critical' };
}

type UrgencyLevel = 'high' | 'medium' | 'low';

function getUrgency(nextReview: string): UrgencyLevel {
  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = differenceInDays(parseISO(today), parseISO(nextReview));
  if (daysOverdue > 3) return 'high';
  if (daysOverdue >= 1) return 'medium';
  return 'low';
}

function getUrgencyBorder(level: UrgencyLevel): string {
  switch (level) {
    case 'high': return 'border-l-2 border-l-red-500';
    case 'medium': return 'border-l-2 border-l-amber-500';
    case 'low': return 'border-l-2 border-l-emerald-500';
  }
}

function getUrgencyLabel(days: number): { text: string; className: string } {
  if (days > 3) return { text: `${days}d overdue`, className: 'text-red-600 dark:text-red-400' };
  if (days >= 1) return { text: `${days}d overdue`, className: 'text-amber-600 dark:text-amber-400' };
  return { text: 'Due today', className: 'text-emerald-600 dark:text-emerald-400' };
}

// --- Quality button config ---
const QUALITY_BUTTONS: {
  quality: number;
  label: string;
  className: string;
  activeClass: string;
}[] = [
  { quality: 1, label: 'Again', className: 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30', activeClass: '' },
  { quality: 2, label: 'Hard', className: 'border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30', activeClass: '' },
  { quality: 3, label: 'Good', className: 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30', activeClass: '' },
  { quality: 5, label: 'Easy', className: 'border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30', activeClass: '' },
];

// --- Component ---
export default function RevisionView() {
  const store = useStore();
  const { subjects, revisionItems } = store;

  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [allItemsOpen, setAllItemsOpen] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  // --- Derived data ---
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

  const remainingDueItems = useMemo(
    () => dueItems.all.filter((r) => !reviewedIds.has(r.id)),
    [dueItems.all, reviewedIds]
  );

  // --- Actions ---
  const handleReview = useCallback((
    itemId: string,
    quality: number
  ) => {
    reviewRevisionItem(store, itemId, quality);
    setReviewedIds((prev) => new Set(prev).add(itemId));
  }, [store]);

  const getSubject = useCallback(
    (subjectId: string) => subjects.find((s) => s.id === subjectId),
    [subjects]
  );

  // --- Render ---
  return (
    <div className='content-area px-4 sm:px-6 py-6 space-y-6'>
      {/* Header */}
      <PageHeader
        title='Revision'
        subtitle='Spaced repetition to cement your knowledge long-term.'
        badge={
          dueItems.total > 0 ? (
            <StatusBadge status='attention' label={`${dueItems.total} due`} />
          ) : undefined
        }
      />

      {/* --- Summary Metrics --- */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <MetricCard
          label='Due Today'
          value={dueItems.total}
          context='topics to review'
          icon={Brain}
          iconColor='text-primary'
        />
        <MetricCard
          label='High Urgency'
          value={dueItems.high.length}
          context={dueItems.high.length > 0 ? 'Overdue 3+ days' : 'No critical items'}
          valueColor={dueItems.high.length > 0 ? 'text-red-600 dark:text-red-400' : undefined}
        />
        <MetricCard
          label='Medium'
          value={dueItems.medium.length}
          context='Slightly overdue'
          valueColor={dueItems.medium.length > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
        />
        <MetricCard
          label='On Time'
          value={dueItems.low.length}
          context='Due today'
          valueColor={dueItems.low.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : undefined}
        />
      </div>

      {/* --- Due Items --- */}
      {remainingDueItems.length > 0 ? (
        <div className='space-y-3'>
          <SectionHeader
            title='Due for Review'
            subtitle={`${remainingDueItems.length} item${remainingDueItems.length !== 1 ? 's' : ''} remaining`}
            action={
              <div className='flex items-center gap-1.5 text-amber-500'>
                <AlertTriangle className='h-3.5 w-3.5' />
                <span className='text-xs font-medium'>Action needed</span>
              </div>
            }
          />
          <AnimatePresence>
            {remainingDueItems.map((item) => {
              const subject = getSubject(item.subjectId);
              const urgency = getUrgency(item.nextReview);
              const mastery = getMasteryStatus(item.repetitions);
              const daysOverdue = differenceInDays(
                parseISO(today),
                parseISO(item.nextReview)
              );
              const urgencyInfo = getUrgencyLabel(daysOverdue);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60, transition: { duration: 0.25 } }}
                >
                  <div className={`metric-card ${getUrgencyBorder(urgency)} p-4`}>
                    <div className='flex flex-col sm:flex-row sm:items-start gap-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <h3 className='text-sm font-medium'>{item.topicName}</h3>
                          <StatusBadge status={mastery.status} label={mastery.label} />
                          {urgency === 'high' && (
                            <span className={`text-[10px] font-semibold ${urgencyInfo.className}`}>
                              {urgencyInfo.text}
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-3 mt-1.5 text-xs text-muted-foreground'>
                          {subject && (
                            <span className='flex items-center gap-1.5'>
                              <span
                                className='status-dot'
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
                          <span className='flex items-center gap-1'>
                            EF: {item.easeFactor.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quality Buttons */}
                      <div className='flex items-center gap-1.5 shrink-0'>
                        {QUALITY_BUTTONS.map((btn) => (
                          <button
                            key={btn.quality}
                            className={`h-8 px-3 text-xs font-medium rounded-md border bg-card transition-colors ${btn.className}`}
                            onClick={() => handleReview(item.id, btn.quality)}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        dueItems.total === 0 && revisionItems.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title='No revision items yet'
            description='Complete syllabus topics to add them to your revision queue.'
          />
        ) : reviewedIds.size > 0 && remainingDueItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title='All caught up!'
            description={`You reviewed ${reviewedIds.size} item${reviewedIds.size > 1 ? 's' : ''} this session. Great work!`}
          />
        ) : null
      )}

      {/* --- Upcoming Reviews --- */}
      {upcomingItems.length > 0 && (
        <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
          <CollapsibleTrigger asChild>
            <button className='flex items-center justify-between w-full group'>
              <div className='flex items-center gap-2.5'>
                <Clock className='h-4 w-4 text-muted-foreground' />
                <SectionHeader
                  title='Upcoming Reviews'
                  subtitle={`Next 7 days`}
                  action={
                    <StatusBadge status='upcoming' label={`${upcomingItems.length}`} className='ml-1' />
                  }
                  className='!mb-0'
                />
              </div>
              {upcomingOpen ? (
                <ChevronDown className='h-4 w-4 text-muted-foreground' />
              ) : (
                <ChevronRight className='h-4 w-4 text-muted-foreground' />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='mt-3 space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin'>
              {upcomingItems.map((item) => {
                const subject = getSubject(item.subjectId);
                const mastery = getMasteryStatus(item.repetitions);
                const daysUntil = differenceInDays(
                  parseISO(item.nextReview),
                  parseISO(today)
                );

                return (
                  <div key={item.id} className='card-interactive flex items-center gap-3 p-3'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate'>{item.topicName}</p>
                      {subject && (
                        <p className='text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5'>
                          <span
                            className='status-dot'
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={mastery.status} label={mastery.label} />
                    <span className='text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0'>
                      {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* --- All Items --- */}
      {revisionItems.length > 0 && (
        <Collapsible open={allItemsOpen} onOpenChange={setAllItemsOpen}>
          <div className='flex items-center justify-between'>
            <CollapsibleTrigger asChild>
              <button className='flex items-center justify-between w-full group'>
                <div className='flex items-center gap-2.5'>
                  <BarChart3 className='h-4 w-4 text-muted-foreground' />
                  <SectionHeader
                    title='All Items'
                    subtitle={`${revisionItems.length} total`}
                    className='!mb-0'
                  />
                </div>
                {allItemsOpen ? (
                  <ChevronDown className='h-4 w-4 text-muted-foreground' />
                ) : (
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                )}
              </button>
            </CollapsibleTrigger>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className='w-[140px] h-7 text-xs'>
                <SelectValue placeholder='Filter' />
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
            <div className='mt-3 space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin'>
              {allFilteredItems.map((item) => {
                const subject = getSubject(item.subjectId);
                const mastery = getMasteryStatus(item.repetitions);
                const daysUntil = differenceInDays(
                  parseISO(item.nextReview),
                  parseISO(today)
                );

                return (
                  <div key={item.id} className='metric-card flex items-center gap-3 p-3'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate'>{item.topicName}</p>
                      {subject && (
                        <p className='text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5'>
                          <span
                            className='status-dot'
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={mastery.status} label={mastery.label} />
                    <div className='text-[11px] text-muted-foreground text-right shrink-0 space-y-0.5'>
                      <p>
                        Last: {item.lastReview ? format(parseISO(item.lastReview), 'MMM d') : 'Never'}
                      </p>
                      <p>
                        Next:{' '}
                        <span className={daysUntil <= 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                          {daysUntil === 0
                            ? 'Today'
                            : daysUntil < 0
                              ? `${Math.abs(daysUntil)}d overdue`
                              : `${daysUntil}d`}
                        </span>
                      </p>
                      <p className='text-muted-foreground/60'>EF: {item.easeFactor.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
              {allFilteredItems.length === 0 && (
                <p className='text-xs text-muted-foreground text-center py-6'>
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
