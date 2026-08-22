'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Inbox,
  Clock,
  CalendarDays,
  Sparkles,
  CheckCheck,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

import { useStore, getTodayTasks, getOverdueTasks } from '@/lib/store';
import type { Task } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
  SectionHeader,
  MetricCard,
} from '@/components/shared';
import { cn } from '@/lib/utils';

// --- Animation helpers ---
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

// --- Helpers ---
const todayStr = () => new Date().toISOString().split('T')[0];

function formatDueDate(dateStr: string): string {
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const date = parseISO(dateStr);

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  const diff = differenceInDays(date, new Date());
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff === 1) return 'Yesterday';
    return `${absDiff} days ago`;
  }
  return format(date, 'MMM d');
}

// --- Task Card ---
function TaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const toggleComplete = useStore((s) => s.toggleTaskComplete);
  const subjects = useStore((s) => s.subjects);
  const subject = task.subjectId
    ? subjects.find((s) => s.id === task.subjectId)
    : null;

  const isOverdue = task.dueDate && !task.completed && task.dueDate < todayStr();

  return (
    <motion.div variants={fadeUp} layout>
      <div
        className={cn(
          'metric-card group flex items-start gap-3 p-3',
          task.completed && 'opacity-50',
          isOverdue && 'border-l-2 border-l-red-500',
        )}
      >
        <button
          onClick={() => toggleComplete(task.id)}
          className='mt-0.5 shrink-0'
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed ? (
            <motion.div
              key={`check-${task.id}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.05 }}
            >
              <CheckCircle2 className='h-[18px] w-[18px] text-emerald-500' />
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <Circle className='h-[18px] w-[18px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors' />
            </motion.div>
          )}
        </button>

        <div className='flex-1 min-w-0'>
          <span
            className={cn('text-sm leading-tight', task.completed ? 'line-through text-muted-foreground' : 'font-medium')}
          >
            {task.title}
          </span>

          {task.description && (
            <p className='text-[11px] text-muted-foreground mt-0.5 line-clamp-1'>
              {task.description}
            </p>
          )}

          <div className='flex items-center gap-2 mt-1.5 flex-wrap'>
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase',
              task.priority === 'high' && 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
              task.priority === 'medium' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
              task.priority === 'low' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            )}>
              <Flag className='h-2 w-2' />
              {task.priority === 'high' ? 'HIGH' : task.priority === 'medium' ? 'MED' : 'LOW'}
            </span>
            {subject && (
              <span
                className='inline-flex items-center gap-1 text-[10px] font-medium'
                style={{ color: subject.color }}
              >
                <span
                  className='status-dot'
                  style={{ backgroundColor: subject.color }}
                />
                {subject.code}
              </span>
            )}
            {task.dueDate && (
              <span className={cn('text-[10px] flex items-center gap-1', isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                <Clock className='h-2.5 w-2.5' />
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={onEdit}
          >
            <Pencil className='h-3 w-3' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive hover:text-destructive'
            onClick={onDelete}
          >
            <Trash2 className='h-3 w-3' />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Add/Edit Task Dialog Form ---
function TaskDialog({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: Task | null;
}) {
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const subjects = useStore((s) => s.subjects);
  const activeSubjects = subjects.filter((s) => !s.archived);

  const isEditing = !!task;

  const initialTitle = task?.title ?? '';
  const initialDescription = task?.description ?? '';
  const initialPriority: Task['priority'] = task?.priority ?? 'medium';
  const initialSubjectId = task?.subjectId ?? 'none';
  const initialDueDate = task?.dueDate ?? '';

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState<Task['priority']>(initialPriority);
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [dueDate, setDueDate] = useState(initialDueDate);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      subjectId: subjectId === 'none' ? undefined : subjectId,
      dueDate: dueDate || undefined,
      completed: task?.completed ?? false,
    };

    if (isEditing && task) {
      updateTask(task.id, data);
    } else {
      addTask(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-base'>{isEditing ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label className='section-label' htmlFor='task-title'>Title *</Label>
            <Input
              id='task-title'
              placeholder='What needs to be done?'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoFocus
            />
          </div>

          <div className='space-y-1.5'>
            <Label className='section-label' htmlFor='task-desc'>Description</Label>
            <Textarea
              id='task-desc'
              placeholder='Optional details...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className='resize-none'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='section-label'>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Task['priority'])}
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Low</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label className='section-label'>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue placeholder='None' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None</SelectItem>
                  {activeSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-1.5'>
            <Label className='section-label' htmlFor='task-due'>Due Date</Label>
            <Input
              id='task-due'
              type='date'
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className='h-8 text-xs'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size='sm' onClick={handleSubmit} disabled={!title.trim()}>
            {isEditing ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---
export default function TasksView() {
  const tasks = useStore((s) => s.tasks);
  const deleteTask = useStore((s) => s.deleteTask);

  const [activeTab, setActiveTab] = useState('today');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const today = todayStr();

  const todayTasks = useMemo(
    () => getTodayTasks({ tasks }).concat(getOverdueTasks({ tasks })),
    [tasks],
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate && t.dueDate < today && !t.completed,
      ),
    [tasks, today],
  );

  const upcomingTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate && t.dueDate > today && !t.completed,
      ),
    [tasks, today],
  );

  const somedayTasks = useMemo(
    () => tasks.filter((t) => !t.dueDate && !t.completed),
    [tasks],
  );

  const doneTasks = useMemo(
    () => tasks.filter((t) => t.completed),
    [tasks],
  );

  const remainingCount = tasks.filter((t) => !t.completed).length;

  const sortByPriority = (list: Task[]) =>
    [...list].sort((a, b) => {
      const prio = { high: 0, medium: 1, low: 2 };
      if (prio[a.priority] !== prio[b.priority])
        return prio[a.priority] - prio[b.priority];
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const tabData: Record<string, { tasks: Task[]; emptyTitle: string; emptyDesc: string; emptyIcon: React.ElementType; emptyAction?: { label: string; onClick: () => void } }> = {
    today: {
      tasks: sortByPriority(todayTasks),
      emptyTitle: 'All clear!',
      emptyDesc: 'Nothing due today. Enjoy your free time or get ahead on upcoming tasks.',
      emptyIcon: CheckCircle2,
      emptyAction: { label: 'Add a Task', onClick: () => { setEditingTask(null); setDialogOpen(true); } },
    },
    overdue: {
      tasks: sortByPriority(overdueTasks),
      emptyTitle: 'On track!',
      emptyDesc: 'No overdue tasks. Great job staying on track!',
      emptyIcon: CheckCheck,
    },
    upcoming: {
      tasks: sortByPriority(upcomingTasks),
      emptyTitle: 'No upcoming tasks',
      emptyDesc: "You haven't set any future due dates. Plan ahead to stay organized.",
      emptyIcon: CalendarDays,
      emptyAction: { label: 'Add a Task', onClick: () => { setEditingTask(null); setDialogOpen(true); } },
    },
    someday: {
      tasks: sortByPriority(somedayTasks),
      emptyTitle: 'No someday tasks',
      emptyDesc: 'Tasks without due dates will appear here. Great for ideas and goals.',
      emptyIcon: Sparkles,
      emptyAction: { label: 'Add a Task', onClick: () => { setEditingTask(null); setDialogOpen(true); } },
    },
    done: {
      tasks: [...doneTasks].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      emptyTitle: 'No completed tasks yet',
      emptyDesc: 'Start checking off tasks to see them here.',
      emptyIcon: CheckCheck,
    },
  };

  const current = tabData[activeTab];

  return (
    <div className='fab-content-pad'>
      {/* Header */}
      <PageHeader
        title='Tasks'
        subtitle={`${remainingCount} remaining, ${doneTasks.length} completed`}
        actions={
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setActiveTab('today')}
            >
              <Inbox className='mr-1 h-3.5 w-3.5' />
              <span className='hidden sm:inline'>Today</span>
            </Button>
            <Button
              onClick={() => {
                setEditingTask(null);
                setDialogOpen(true);
              }}
              size='sm'
              className='h-8'
            >
              <Plus className='mr-1.5 h-3.5 w-3.5' />
              <span className='hidden sm:inline text-xs'>Add Task</span>
            </Button>
          </div>
        }
      />

      {/* Summary metrics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid grid-cols-2 sm:grid-cols-4 gap-3'
      >
        <MetricCard
          label='Today'
          value={todayTasks.length}
          context='due now'
          valueColor={todayTasks.length > 0 ? undefined : 'text-muted-foreground'}
        />
        <MetricCard
          label='Overdue'
          value={overdueTasks.length}
          context={overdueTasks.length > 0 ? 'needs attention' : 'on track'}
          valueColor={overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : undefined}
        />
        <MetricCard
          label='Upcoming'
          value={upcomingTasks.length}
          context='future tasks'
        />
        <MetricCard
          label='Completed'
          value={doneTasks.length}
          context='of {tasks.length} total'
          valueColor='text-emerald-600 dark:text-emerald-400'
        />
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className='overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'>
          <TabsList className='inline-flex w-auto min-w-0 h-8'>
            <TabsTrigger value='today' className='gap-1.5 text-xs'>
              <Inbox className='h-3 w-3 hidden sm:block' />
              Today
              {todayTasks.length > 0 && (
                <span className='ml-0.5 h-4 min-w-4 px-1 text-[9px] font-semibold rounded-full bg-primary/10 text-primary inline-flex items-center justify-center'>
                  {todayTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='overdue' className='gap-1.5 text-xs'>
              <AlertTriangle className='h-3 w-3 hidden sm:block' />
              Overdue
              {overdueTasks.length > 0 && (
                <span className='ml-0.5 h-4 min-w-4 px-1 text-[9px] font-semibold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 inline-flex items-center justify-center'>
                  {overdueTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='upcoming' className='gap-1.5 text-xs'>
              <CalendarDays className='h-3 w-3 hidden sm:block' />
              Upcoming
              {upcomingTasks.length > 0 && (
                <span className='ml-0.5 h-4 min-w-4 px-1 text-[9px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 inline-flex items-center justify-center'>
                  {upcomingTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='someday' className='gap-1.5 text-xs'>
              <Sparkles className='h-3 w-3 hidden sm:block' />
              Someday
              {somedayTasks.length > 0 && (
                <span className='ml-0.5 h-4 min-w-4 px-1 text-[9px] font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 inline-flex items-center justify-center'>
                  {somedayTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='done' className='gap-1.5 text-xs'>
              <CheckCheck className='h-3 w-3 hidden sm:block' />
              Done
              {doneTasks.length > 0 && (
                <span className='ml-0.5 h-4 min-w-4 px-1 text-[9px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center'>
                  {doneTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {['today', 'overdue', 'upcoming', 'someday', 'done'].map((tab) => (
          <TabsContent key={tab} value={tab} className='mt-4'>
            {tabData[tab].tasks.length === 0 ? (
              <EmptyState
                icon={tabData[tab].emptyIcon}
                title={tabData[tab].emptyTitle}
                description={tabData[tab].emptyDesc}
                action={tabData[tab].emptyAction ? (
                  <Button variant='outline' size='sm' onClick={tabData[tab].emptyAction.onClick}>
                    {tabData[tab].emptyAction.label}
                  </Button>
                ) : undefined}
              />
            ) : (
              <motion.div
                variants={container}
                initial='hidden'
                animate='show'
                className='space-y-1.5'
              >
                <AnimatePresence mode='popLayout'>
                  {tabData[tab].tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => {
                        setEditingTask(task);
                        setDialogOpen(true);
                      }}
                      onDelete={() => setDeleteId(task.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <TaskDialog
        key={editingTask?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingTask(null);
        }}
        task={editingTask}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteTask(deleteId);
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
