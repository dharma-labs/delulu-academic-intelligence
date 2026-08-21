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
  getDay,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    // Only allow delete for real calendar events (not derived)
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
    <div className='p-4 md:p-6 max-w-7xl mx-auto'>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'
      >
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Calendar</h1>
          <p className='text-muted-foreground text-sm mt-1'>Track exams, deadlines, and events</p>
        </div>
        <Button onClick={() => openAddDialog()} className='w-full sm:w-auto'>
          <Plus className='h-4 w-4 mr-2' />
          Add Event
        </Button>
      </motion.div>

      {/* Month Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className='flex items-center justify-between mb-4'
      >
        <Button variant='outline' size='icon' onClick={goToPrevMonth}>
          <ChevronLeft className='h-4 w-4' />
        </Button>
        <div className='flex items-center gap-3'>
          <h2 className='text-lg font-semibold'>{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant='outline' size='sm' onClick={goToToday}>
            Today
          </Button>
        </div>
        <Button variant='outline' size='icon' onClick={goToNextMonth}>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </motion.div>

      {/* Calendar Grid + Day Detail */}
      <div className='flex flex-col lg:flex-row gap-6'>
        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className='flex-1 min-w-0'
        >
          <Card>
            {/* Week Day Headers */}
            <div className='grid grid-cols-7 border-b'>
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className='py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider'
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
                      relative min-h-[80px] md:min-h-[100px] p-2 text-left border-b border-r transition-colors
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      ${!isCurrentMonth ? 'opacity-30 bg-muted/30' : 'hover:bg-muted/50'}
                      ${isSelected ? 'bg-primary/5 ring-2 ring-inset ring-primary' : ''}
                    `}
                  >
                    <span
                      className={`
                        inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium
                        ${isTodayDate ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : ''}
                        ${!isTodayDate && isSelected ? 'font-bold text-primary' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Event dots */}
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className='h-1.5 w-1.5 rounded-full flex-shrink-0'
                          style={{
                            backgroundColor: ev.color || EVENT_TYPES[ev.type]?.color || '#737373',
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className='text-[10px] text-muted-foreground leading-none'>
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
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
              className='w-full lg:w-80 xl:w-96 flex-shrink-0'
            >
              <Card className='sticky top-6'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-lg'>
                      {format(selectedDate, 'EEEE, MMM d')}
                    </CardTitle>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => openAddDialog(selectedDate)}
                      >
                        <Plus className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => setSelectedDate(null)}
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                  {isToday(selectedDate) && (
                    <Badge variant='secondary' className='mt-1'>
                      Today
                    </Badge>
                  )}
                </CardHeader>
                <Separator />
                <CardContent className='pt-4'>
                  {selectedEvents.length === 0 ? (
                    <div className='text-center py-8'>
                      <CalendarDays className='h-10 w-10 mx-auto text-muted-foreground/40 mb-3' />
                      <p className='text-sm text-muted-foreground'>No events on this day</p>
                      <Button
                        variant='outline'
                        size='sm'
                        className='mt-3'
                        onClick={() => openAddDialog(selectedDate)}
                      >
                        <Plus className='h-3.5 w-3.5 mr-1.5' />
                        Add Event
                      </Button>
                    </div>
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
                              className='group relative p-3 rounded-lg border border-border hover:border-primary/30 transition-colors'
                            >
                              <div className='flex items-start gap-3'>
                                <div
                                  className='mt-0.5 h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0'
                                  style={{ backgroundColor: `${typeConfig.color}15` }}
                                >
                                  <Icon
                                    className='h-4 w-4'
                                    style={{ color: typeConfig.color }}
                                  />
                                </div>
                                <div className='flex-1 min-w-0'>
                                  <p className='text-sm font-medium leading-tight truncate'>
                                    {event.title}
                                  </p>
                                  <Badge
                                    variant='secondary'
                                    className='mt-1.5 text-[10px]'
                                    style={{
                                      backgroundColor: `${typeConfig.color}15`,
                                      color: typeConfig.color,
                                      borderColor: `${typeConfig.color}30`,
                                    }}
                                  >
                                    {typeConfig.label}
                                  </Badge>
                                  {subjectName && (
                                    <div className='flex items-center gap-1.5 mt-1.5'>
                                      {subjectColor && (
                                        <span
                                          className='h-2 w-2 rounded-full flex-shrink-0'
                                          style={{ backgroundColor: subjectColor }}
                                        />
                                      )}
                                      <span className='text-xs text-muted-foreground truncate'>
                                        {subjectName}
                                      </span>
                                    </div>
                                  )}
                                  {event.description && (
                                    <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                {isRealEvent && (
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id);
                                    }}
                                  >
                                    <Trash2 className='h-3.5 w-3.5' />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
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
            <div className='space-y-2'>
              <Label htmlFor='event-title'>Title</Label>
              <Input
                id='event-title'
                placeholder='Event title'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='event-date'>Date</Label>
                <Input
                  id='event-date'
                  type='date'
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='event-enddate'>End Date (optional)</Label>
                <Input
                  id='event-enddate'
                  type='date'
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='event-type'>Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as CalendarEvent['type'])}
              >
                <SelectTrigger id='event-type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className='flex items-center gap-2'>
                        <span
                          className='h-2.5 w-2.5 rounded-full'
                          style={{ backgroundColor: cfg.color }}
                        />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='event-subject'>Subject (optional)</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger id='event-subject'>
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
                            className='h-2.5 w-2.5 rounded-full'
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='event-desc'>Description (optional)</Label>
              <Textarea
                id='event-desc'
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
