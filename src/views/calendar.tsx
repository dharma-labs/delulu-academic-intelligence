'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  BookOpenCheck,
  FileText,
  AlertTriangle,
  GraduationCap,
  ListChecks,
  Star,
  X,
  Trash2,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader, EmptyState } from '@/components/shared';
import type { CalendarEvent } from '@/lib/types';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// -- Event type config ------------------------------------------------
const EVENT_TYPES: Record<
  CalendarEvent['type'],
  { color: string; dotClass: string; label: string; icon: typeof BookOpenCheck }
> = {
  exam: { color: '#E5484D', dotClass: 'bg-red-500', label: 'Exam', icon: GraduationCap },
  assignment: {
    color: '#D99200',
    dotClass: 'bg-amber-500',
    label: 'Assignment',
    icon: FileText,
  },
  deadline: { color: '#E5484D', dotClass: 'bg-red-500', label: 'Deadline', icon: AlertTriangle },
  class: { color: '#3478F6', dotClass: 'bg-sky-500', label: 'Class', icon: BookOpenCheck },
  task: { color: '#8B5CF6', dotClass: 'bg-violet-500', label: 'Task', icon: ListChecks },
  custom: { color: '#737373', dotClass: 'bg-neutral-500', label: 'Custom', icon: Star },
  event: { color: '#16A36A', dotClass: 'bg-emerald-500', label: 'Event', icon: CalendarDays },
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// -- Main component ---------------------------------------------------
export default function CalendarView() {
  const { calendarEvents, subjects, tasks, assignments, exams, addCalendarEvent, deleteCalendarEvent } =
    useStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<CalendarEvent['type']>('event');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Build a composite event list from calendarEvents + derived from tasks, assignments, exams
  const allEvents = useMemo(() => {
    const derived: CalendarEvent[] = [];

    // Tasks with due dates
    for (const t of tasks) {
      if (t.dueDate && !t.completed) {
        derived.push({
          id: `task-${t.id}`,
          title: t.title,
          date: t.dueDate,
          type: 'task',
          subjectId: t.subjectId,
          description: t.description,
        });
      }
    }

    // Assignments
    for (const a of assignments) {
      if (a.status !== 'completed') {
        derived.push({
          id: `asgn-${a.id}`,
          title: a.title,
          date: a.deadline,
          type: 'assignment',
          subjectId: a.subjectId,
          description: a.description,
        });
      }
    }

    // Exams
    for (const e of exams) {
      if (e.status === 'upcoming') {
        derived.push({
          id: `exam-${e.id}`,
          title: e.name,
          date: e.date,
          type: 'exam',
          subjectId: e.subjectId,
        });
      }
    }

    return [...calendarEvents, ...derived];
  }, [calendarEvents, tasks, assignments, exams]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Events for a specific date
  const getEventsForDate = useCallback(
    (date: Date) => {
      return allEvents
        .filter((e) => isSameDay(date, parseISO(e.date)))
        .sort((a, b) => a.title.localeCompare(b.title));
    },
    [allEvents]
  );

  // Selected date events
  const selectedEvents = useMemo(
    () => (selectedDate ? getEventsForDate(selectedDate) : []),
    [selectedDate, getEventsForDate]
  );

  // Handlers
  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const openAddDialog = (date?: Date) => {
    if (date) {
      setFormDate(format(date, 'yyyy-MM-dd'));
      setSelectedDate(date);
    } else if (selectedDate) {
      setFormDate(format(selectedDate, 'yyyy-MM-dd'));
    } else {
      setFormDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setFormEndDate('');
    setFormTitle('');
    setFormType('event');
    setFormSubject('');
    setFormDescription('');
    setDialogOpen(true);
  };

  const handleAddEvent = () => {
    if (!formTitle.trim() || !formDate) return;
    const typeConfig = EVENT_TYPES[formType];
    addCalendarEvent({
      title: formTitle.trim(),
      date: formDate,
      endDate: formEndDate || undefined,
      type: formType,
      subjectId: formSubject || undefined,
      description: formDescription.trim() || undefined,
      color: typeConfig.color,
    });
    setDialogOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (eventId.startsWith('task-') || eventId.startsWith('asgn-') || eventId.startsWith('exam-')) return;
    deleteCalendarEvent(eventId);
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return null;
    return subjects.find((s) => s.id === subjectId)?.name;
  };
  const getSubjectColor = (subjectId?: string) => {
    if (!subjectId) return null;
    return subjects.find((s) => s.id === subjectId)?.color;
  };

  return (
    <div className='p-4 md:p-6 content-area animate-fade-slide-in'>
      {/* Header */}
      <PageHeader
        title='Calendar'
        subtitle='Track exams, deadlines, and events'
        actions={
          <Button onClick={() => openAddDialog()} size='sm'>
            <Plus className='h-4 w-4 mr-1.5' />
            Add Event
          </Button>
        }
      />

      {/* Month Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className='flex items-center justify-between mb-4'
      >
        <Button variant='outline' size='icon' className='h-8 w-8' onClick={goToPrevMonth}>
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <div className='flex items-center gap-3'>
          <h2 className='text-sm font-semibold'>{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant='outline' size='sm' className='h-7 text-xs' onClick={goToToday}>
            Today
          </Button>
        </div>
        <Button variant='outline' size='icon' className='h-8 w-8' onClick={goToNextMonth}>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </motion.div>

      {/* Calendar Grid + Day Detail */}
      <div className='flex flex-col lg:flex-row gap-4'>
        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className='flex-1 min-w-0'
        >
          <div className='bg-card border border-border rounded-lg overflow-hidden'>
            {/* Week Day Headers */}
            <div className='grid grid-cols-7 border-b border-border'>
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className='py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className='grid grid-cols-7'>
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative min-h-[72px] md:min-h-[88px] p-1.5 text-left border-b border-r border-border transition-colors
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      ${!isCurrentMonth ? 'opacity-25 bg-secondary/50' : 'hover:bg-secondary/50'}
                      ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/40' : ''}
                    `}
                  >
                    <span
                      className={`
                        inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium
                        ${isTodayDate ? 'bg-primary text-primary-foreground' : ''}
                        ${!isTodayDate && isSelected ? 'font-bold text-primary' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Event dots */}
                    <div className='mt-1 flex flex-wrap gap-[3px]'>
                      {dayEvents.slice(0, 4).map((ev) => (
                        <span
                          key={ev.id}
                          className='h-1.5 w-1.5 rounded-full shrink-0'
                          style={{
                            backgroundColor: ev.color || EVENT_TYPES[ev.type]?.color || '#737373',
                          }}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className='text-[9px] text-muted-foreground leading-none ml-0.5'>
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Day Detail Panel */}
        <AnimatePresence mode='wait'>
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className='w-full lg:w-80 xl:w-96 shrink-0'
            >
              <div className='bg-card border border-border rounded-lg sticky top-6'>
                <div className='p-4 pb-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-sm font-semibold'>
                        {format(selectedDate, 'EEEE, MMM d')}
                      </h3>
                      {isToday(selectedDate) && (
                        <span className='signal-healthy inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider'>
                          Today
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-0.5'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => openAddDialog(selectedDate)}
                      >
                        <Plus className='h-3.5 w-3.5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => setSelectedDate(null)}
                      >
                        <X className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className='p-4'>
                  {selectedEvents.length === 0 ? (
                    <EmptyState
                      icon={CalendarDays}
                      title='No events on this day'
                      description='Click + to add a new event'
                      action={
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openAddDialog(selectedDate)}
                        >
                          <Plus className='h-3.5 w-3.5 mr-1' />
                          Add Event
                        </Button>
                      }
                      className='py-8'
                    />
                  ) : (
                    <ScrollArea className='max-h-[400px] scrollbar-thin'>
                      <motion.div
                        variants={container}
                        initial='hidden'
                        animate='show'
                        className='space-y-2'
                      >
                        {selectedEvents.map((event) => {
                          const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES.event;
                          const Icon = typeConfig.icon;
                          const isRealEvent = !event.id.startsWith('task-') &&
                            !event.id.startsWith('asgn-') &&
                            !event.id.startsWith('exam-');
                          const subjectName = getSubjectName(event.subjectId);
                          const subjectColor = getSubjectColor(event.subjectId);

                          return (
                            <motion.div
                              key={event.id}
                              variants={fadeUp}
                              className='group relative p-3 rounded-lg border border-border hover:border-primary/25 transition-colors'
                            >
                              <div className='flex items-start gap-2.5'>
                                <div
                                  className='mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0'
                                  style={{ backgroundColor: `${typeConfig.color}12` }}
                                >
                                  <Icon
                                    className='h-3.5 w-3.5'
                                    style={{ color: typeConfig.color }}
                                  />
                                </div>
                                <div className='flex-1 min-w-0'>
                                  <p className='text-xs font-medium leading-tight truncate'>
                                    {event.title}
                                  </p>
                                  <div className='flex items-center gap-1.5 mt-1'>
                                    <span
                                      className='text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded'
                                      style={{
                                        backgroundColor: `${typeConfig.color}12`,
                                        color: typeConfig.color,
                                      }}
                                    >
                                      {typeConfig.label}
                                    </span>
                                  </div>
                                  {subjectName && (
                                    <div className='flex items-center gap-1.5 mt-1.5'>
                                      {subjectColor && (
                                        <span
                                          className='status-dot'
                                          style={{ backgroundColor: subjectColor }}
                                        />
                                      )}
                                      <span className='text-[11px] text-muted-foreground truncate'>
                                        {subjectName}
                                      </span>
                                    </div>
                                  )}
                                  {event.description && (
                                    <p className='text-[11px] text-muted-foreground mt-1 line-clamp-2'>
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                {isRealEvent && (
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id);
                                    }}
                                  >
                                    <Trash2 className='h-3 w-3' />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <span className='section-label'>Title</span>
              <Input
                placeholder='Event title'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <span className='section-label'>Date</span>
                <Input
                  type='date'
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <span className='section-label'>End Date (optional)</span>
                <Input
                  type='date'
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <span className='section-label'>Type</span>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as CalendarEvent['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className='flex items-center gap-2'>
                        <span
                          className='status-dot'
                          style={{ backgroundColor: cfg.color }}
                        />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <span className='section-label'>Subject (optional)</span>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger>
                  <SelectValue placeholder='No subject' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No subject</SelectItem>
                  {subjects
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className='flex items-center gap-2'>
                          <span
                            className='status-dot'
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <span className='section-label'>Description (optional)</span>
              <Textarea
                placeholder='Add notes...'
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent} disabled={!formTitle.trim() || !formDate}>
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
