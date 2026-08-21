'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trash2,
  Calendar,
  Timer,
} from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';

import { useStore } from '@/lib/store';
import type { TimetableSlot } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  EmptyState,
  MetricCard,
} from '@/components/shared';

// -- Constants --------------------------------------------------------
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SLOT_HEIGHT = 48;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getSlotTop(time: string): number {
  const minutes = timeToMinutes(time);
  const offset = minutes - START_HOUR * 60;
  return (offset / 30) * SLOT_HEIGHT;
}

function getSlotHeight(start: string, end: string): number {
  const diff = timeToMinutes(end) - timeToMinutes(start);
  return (diff / 30) * SLOT_HEIGHT;
}

function getNowIndicatorTop(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const offset = minutes - START_HOUR * 60;
  return (offset / 30) * SLOT_HEIGHT;
}

// -- Animation --------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// -- Time labels ------------------------------------------------------
function generateTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    labels.push(formatTime(`${h}:00`));
  }
  labels.push(formatTime(`${END_HOUR}:00`));
  return labels;
}

const TIME_LABELS = generateTimeLabels();

// -- Add Slot Dialog --------------------------------------------------
function SlotDialog({
  open,
  onOpenChange,
  slot,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot: TimetableSlot | null;
}) {
  const addTimetableSlot = useStore((s) => s.addTimetableSlot);
  const updateTimetableSlot = useStore((s) => s.updateTimetableSlot);
  const subjects = useStore((s) => s.subjects);
  const timetableSlots = useStore((s) => s.timetableSlots);
  const activeSubjects = subjects.filter((s) => !s.archived);

  const isEditing = !!slot;
  const initialSubject = slot?.subjectId ?? (activeSubjects[0]?.id ?? '');
  const initialDay = slot ? String(slot.day) : String(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const initialStart = slot?.startTime ?? '09:00';
  const initialEnd = slot?.endTime ?? '10:00';
  const initialRoom = slot?.room ?? '';
  const initialType = slot?.type ?? 'lecture';

  const [subjectId, setSubjectId] = useState(initialSubject);
  const [day, setDay] = useState(initialDay);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [room, setRoom] = useState(initialRoom);
  const [type, setType] = useState<TimetableSlot['type']>(initialType);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    if (endMin <= startMin) {
      setError('End time must be after start time.');
      return;
    }

    if (startMin < START_HOUR * 60 || endMin > END_HOUR * 60) {
      setError(`Time must be between ${formatTime(`${START_HOUR}:00`)} and ${formatTime(`${END_HOUR}:00`)}.`);
      return;
    }

    const dayNum = Number(day) as TimetableSlot['day'];
    const overlapping = timetableSlots.find((s) => {
      if (s.id === slot?.id) return false;
      if (s.day !== dayNum) return false;
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime);
      return startMin < sEnd && endMin > sStart;
    });

    if (overlapping) {
      const subject = subjects.find((s) => s.id === overlapping.subjectId);
      setError(`Overlaps with ${subject?.name ?? 'another class'} (${formatTime(overlapping.startTime)} - ${formatTime(overlapping.endTime)}).`);
      return;
    }

    const data = {
      subjectId,
      day: dayNum,
      startTime,
      endTime,
      room: room.trim() || undefined,
      type,
    };

    if (isEditing && slot) {
      updateTimetableSlot(slot.id, data);
    } else {
      addTimetableSlot(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Slot' : 'Add Timetable Slot'}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {error && (
            <div className='text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md px-3 py-2'>
              {error}
            </div>
          )}

          <div className='space-y-2'>
            <Label className='section-label'>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder='Select subject' /></SelectTrigger>
              <SelectContent>
                {activeSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label className='section-label'>Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{DAY_FULL[i]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='section-label'>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TimetableSlot['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='lecture'>Lecture</SelectItem>
                  <SelectItem value='lab'>Lab</SelectItem>
                  <SelectItem value='tutorial'>Tutorial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label className='section-label'>Start Time</Label>
              <Input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label className='section-label'>End Time</Label>
              <Input type='time' value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='slot-room' className='section-label'>Room (optional)</Label>
            <Input id='slot-room' placeholder='e.g. Room 301' value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Desktop Weekly Grid ----------------------------------------------
function WeeklyGrid({
  weekStart,
  onSlotClick,
}: {
  weekStart: Date;
  onSlotClick: (slot: TimetableSlot) => void;
}) {
  const timetableSlots = useStore((s) => s.timetableSlots);
  const subjects = useStore((s) => s.subjects);
  const today = new Date();
  const gridRef = useRef<HTMLDivElement>(null);
  const [nowTop, setNowTop] = useState(getNowIndicatorTop);

  const getColIndex = (day: number) => (day === 0 ? 6 : day - 1);
  const todayCol = getColIndex(today.getDay());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTop(getNowIndicatorTop());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      const top = getNowIndicatorTop() - 200;
      gridRef.current.scrollTop = Math.max(0, top);
    }
  }, []);

  const totalHeight = TOTAL_HOURS * 2 * SLOT_HEIGHT;
  const isTodayInView = todayCol >= 0 && todayCol <= 6;
  const nowInRange = nowTop >= 0 && nowTop <= totalHeight;

  const typeSignalClass = (type: TimetableSlot['type']) => {
    switch (type) {
      case 'lecture': return 'bg-secondary text-muted-foreground';
      case 'lab': return 'signal-attention';
      case 'tutorial': return 'signal-healthy';
    }
  };

  return (
    <div ref={gridRef} className='overflow-y-auto scrollbar-thin max-h-[calc(100vh-280px)] rounded-lg border border-border bg-card'>
      <div className='relative min-w-[700px]'>
        {/* Header row */}
        <div className='sticky top-0 z-20 bg-card border-b border-border'>
          <div className='grid grid-cols-[60px_repeat(7,1fr)]'>
            <div className='p-2' />
            {DAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[11px] font-semibold tracking-wider uppercase py-2 border-l border-border ${
                  i === todayCol ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Time grid */}
        <div className='relative' style={{ height: totalHeight }}>
          {/* Grid lines and labels */}
          {TIME_LABELS.map((label, i) => {
            const top = i * SLOT_HEIGHT;
            return (
              <div key={label}>
                <div
                  className='absolute left-0 w-[56px] text-right pr-2 text-[10px] text-muted-foreground -translate-y-1/2'
                  style={{ top }}
                >
                  {label}
                </div>
                <div
                  className='absolute left-[60px] right-0 border-t border-border/40'
                  style={{ top }}
                />
              </div>
            );
          })}

          {/* Vertical day lines */}
          {DAYS.map((_, i) => (
            <div
              key={`vline-${i}`}
              className={`absolute top-0 bottom-0 border-l border-border/40 ${
                i === todayCol ? 'bg-primary/[0.02]' : ''
              }`}
              style={{
                left: `calc(60px + ${i} * ((100% - 60px) / 7))`,
              }}
            />
          ))}

          {/* Today highlight column */}
          {isTodayInView && (
            <div
              className='absolute top-0 bottom-0 bg-primary/[0.03] pointer-events-none'
              style={{
                left: `calc(60px + ${todayCol} * ((100% - 60px) / 7))`,
                width: `calc((100% - 60px) / 7)`,
              }}
            />
          )}

          {/* Slots */}
          {timetableSlots.map((slot) => {
            const colIndex = slot.day === 0 ? 6 : slot.day - 1;
            const subject = subjects.find((s) => s.id === slot.subjectId);
            if (!subject) return null;

            const top = getSlotTop(slot.startTime);
            const height = getSlotHeight(slot.startTime, slot.endTime);

            return (
              <button
                key={slot.id}
                onClick={() => onSlotClick(slot)}
                className='absolute rounded-md px-2 py-1 text-left overflow-hidden cursor-pointer transition-all hover:brightness-110 hover:z-10 group'
                style={{
                  top: top + 1,
                  height: height - 2,
                  left: `calc(60px + ${colIndex} * ((100% - 60px) / 7) + 2px)`,
                  width: `calc((100% - 60px) / 7 - 4px)`,
                  backgroundColor: subject.color + '15',
                  borderLeft: `3px solid ${subject.color}`,
                }}
              >
                <p className='text-[11px] font-semibold truncate' style={{ color: subject.color }}>
                  {subject.code}
                </p>
                {height >= 40 && (
                  <p className='text-[10px] text-muted-foreground truncate'>
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </p>
                )}
                {height >= 56 && slot.room && (
                  <p className='text-[10px] text-muted-foreground truncate flex items-center gap-0.5'>
                    <MapPin className='h-2.5 w-2.5' />{slot.room}
                  </p>
                )}
                {height >= 72 && (
                  <span className={`inline-flex items-center px-1 py-0 rounded text-[9px] font-semibold tracking-wider uppercase mt-0.5 ${typeSignalClass(slot.type)}`}>
                    {slot.type}
                  </span>
                )}
              </button>
            );
          })}

          {/* Now indicator */}
          {isTodayInView && nowInRange && (
            <div
              className='absolute left-[60px] right-0 z-30 pointer-events-none'
              style={{ top: nowTop }}
            >
              <div className='flex items-center'>
                <div className='w-2 h-2 rounded-full bg-red-500 -ml-[4px] shrink-0' />
                <div className='h-[1.5px] flex-1 bg-red-500' />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Mobile Today View ------------------------------------------------
function MobileTodayView({ onSlotClick }: { onSlotClick: (slot: TimetableSlot) => void }) {
  const timetableSlots = useStore((s) => s.timetableSlots);
  const subjects = useStore((s) => s.subjects);

  const today = new Date();
  const jsDay = today.getDay();
  const storeDay = (jsDay === 0 ? 6 : jsDay - 1) as TimetableSlot['day'];

  const todaySlots = timetableSlots
    .filter((s) => s.day === storeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const currentSlot = todaySlots.find((s) => {
    const start = timeToMinutes(s.startTime);
    const end = timeToMinutes(s.endTime);
    return nowMinutes >= start && nowMinutes < end;
  });

  const nextSlot = todaySlots.find((s) => timeToMinutes(s.startTime) > nowMinutes);

  const typeSignalClass = (type: TimetableSlot['type']) => {
    switch (type) {
      case 'lecture': return 'bg-secondary text-muted-foreground';
      case 'lab': return 'signal-attention';
      case 'tutorial': return 'signal-healthy';
    }
  };

  if (todaySlots.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title='No classes today'
        description='Enjoy your day off or catch up on studies.'
      />
    );
  }

  return (
    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} initial='hidden' animate='show' className='space-y-2'>
      {todaySlots.map((slot) => {
        const subject = subjects.find((s) => s.id === slot.subjectId);
        if (!subject) return null;

        const isCurrent = currentSlot?.id === slot.id;
        const isNext = nextSlot?.id === slot.id;
        const isPast = nowMinutes >= timeToMinutes(slot.endTime);

        return (
          <motion.div
            key={slot.id}
            variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
          >
            <button
              onClick={() => onSlotClick(slot)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : isNext
                  ? 'border-primary/25 bg-card hover:border-primary/40'
                  : isPast
                  ? 'border-border opacity-40'
                  : 'border-border bg-card hover:border-primary/25'
              }`}
            >
              <div className='flex items-start gap-3'>
                <div className='flex flex-col items-center pt-1'>
                  <div
                    className={`status-dot mt-0.5 ${
                      isCurrent ? 'bg-primary' :
                      isNext ? 'bg-primary' :
                      'bg-muted-foreground/30'
                    }`}
                  />
                  <div className='w-px h-8 mt-1 bg-border' />
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='text-sm font-medium' style={{ color: subject.color }}>
                      {subject.name}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${typeSignalClass(slot.type)}`}>
                      {slot.type}
                    </span>
                    {isCurrent && (
                      <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-primary text-primary-foreground'>
                        NOW
                      </span>
                    )}
                    {isNext && !isCurrent && (
                      <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-secondary text-muted-foreground'>
                        NEXT
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Clock className='h-3 w-3' />
                      {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                    </span>
                    {slot.room && (
                      <span className='flex items-center gap-1'>
                        <MapPin className='h-3 w-3' />
                        {slot.room}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// -- Next Class Card --------------------------------------------------
function NextClassCard() {
  const timetableSlots = useStore((s) => s.timetableSlots);
  const subjects = useStore((s) => s.subjects);

  const today = new Date();
  const jsDay = today.getDay();
  const storeDay = (jsDay === 0 ? 6 : jsDay - 1) as TimetableSlot['day'];
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const todaySlots = timetableSlots
    .filter((s) => s.day === storeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const nextSlot = todaySlots.find((s) => timeToMinutes(s.startTime) > nowMinutes);
  const subject = nextSlot ? subjects.find((s) => s.id === nextSlot.subjectId) : null;

  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!nextSlot) return;

    const update = () => {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const startMin = timeToMinutes(nextSlot.startTime);
      const diff = startMin - nowMin;
      if (diff <= 0) {
        setCountdown('Starting now');
      } else if (diff < 60) {
        setCountdown(`Starts in ${diff} min`);
      } else {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        setCountdown(`Starts in ${h}h ${m}m`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [nextSlot]);

  if (!nextSlot || !subject) return null;

  return (
    <motion.div variants={fadeUp} initial='hidden' animate='show'>
      <MetricCard
        label='Next Class'
        value={subject.name}
        context={`${formatTime(nextSlot.startTime)} – ${formatTime(nextSlot.endTime)}${nextSlot.room ? ` · ${nextSlot.room}` : ''}`}
        icon={Timer}
        iconColor='text-primary'
        className='border-primary/20'
        valueColor='text-base'
      />
    </motion.div>
  );
}

// -- Main Component ---------------------------------------------------
export default function TimetableView() {
  const deleteTimetableSlot = useStore((s) => s.deleteTimetableSlot);

  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset],
  );

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'Current Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset === -1) return 'Last Week';
    return `Week of ${format(weekStart, 'MMM d')}`;
  }, [weekOffset, weekStart]);

  const handleSlotClick = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setDialogOpen(true);
  };

  return (
    <div className='p-4 md:p-6 content-area space-y-4'>
      {/* Header */}
      <PageHeader
        title='Timetable'
        subtitle={weekLabel}
        actions={
          <div className='flex items-center gap-2'>
            <div className='flex items-center bg-secondary rounded-lg p-0.5'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-xs'
                onClick={() => setWeekOffset(0)}
              >
                Today
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
            <Button
              size='sm'
              className='gap-1.5'
              onClick={() => {
                setEditingSlot(null);
                setDialogOpen(true);
              }}
            >
              <Plus className='h-4 w-4' />
              <span className='hidden sm:inline'>Add Slot</span>
            </Button>
          </div>
        }
      />

      {/* Next Class Card */}
      <NextClassCard />

      {/* Desktop: Weekly Grid */}
      <div className='hidden md:block'>
        <WeeklyGrid weekStart={weekStart} onSlotClick={handleSlotClick} />
      </div>

      {/* Mobile: Today's Schedule */}
      <div className='md:hidden'>
        <MobileTodayView onSlotClick={handleSlotClick} />
      </div>

      {/* Add/Edit Dialog */}
      <SlotDialog
        key={editingSlot?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingSlot(null);
        }}
        slot={editingSlot}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this timetable slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteTimetableSlot(deleteId);
                setDeleteId(null);
              }}
              className='bg-destructive text-white hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
