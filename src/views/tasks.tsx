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
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

import { useStore, getTodayTasks, getOverdueTasks } from '@/lib/store';
import type { Task } from '@/lib/types';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// -- Helpers ----------------------------------------------------------
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

function priorityConfig(priority: Task['priority']) {
  switch (priority) {
    case 'high':
      return {
        label: 'HIGH',
        className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-900',
      };
    case 'medium':
      return {
        label: 'MEDIUM',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-900',
      };
    case 'low':
      return {
        label: 'LOW',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      };
  }
}

// -- Task Card --------------------------------------------------------
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
  const p = priorityConfig(task.priority);

  return (
    <motion.div variants={fadeUp} layout>
      <Card
        className={`group transition-colors hover:border-primary/30 ${task.completed ? 'opacity-60' : ''}`}
      >
        <CardContent className='flex items-start gap-3 p-4'>
          <button
            onClick={() => toggleComplete(task.id)}
            className='mt-0.5 shrink-0'
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.completed ? (
              <CheckCircle2 className='h-5 w-5 text-emerald-500' />
            ) : (
              <Circle className='h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground transition-colors' />
            )}
          </button>

          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span
                className={`font-medium text-sm leading-tight ${task.completed ? 'line-through text-muted-foreground' : ''}`}
              >
                {task.title}
              </span>
            </div>

            {task.description && (
              <p className='text-xs text-muted-foreground mt-1 line-clamp-1'>
                {task.description}
              </p>
            )}

            <div className='flex items-center gap-2 mt-2 flex-wrap'>
              <Badge variant='outline' className={`text-[10px] px-1.5 py-0 border ${p.className}`}>
                {p.label}
              </Badge>
              {subject && (
                <Badge
                  variant='outline'
                  className='text-[10px] px-1.5 py-0'
                  style={{
                    borderColor: subject.color + '60',
                    color: subject.color,
                  }}
                >
                  {subject.code}
                </Badge>
              )}
              {task.dueDate && (
                <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  {formatDueDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>

          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={onEdit}
            >
              <Pencil className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-destructive hover:text-destructive'
              onClick={onDelete}
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// -- Empty State ------------------------------------------------------
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex flex-col items-center justify-center py-16 px-4 text-center'
    >
      <div className='h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4'>
        <Icon className='h-6 w-6 text-muted-foreground' />
      </div>
      <p className='font-medium text-sm text-foreground mb-1'>{title}</p>
      <p className='text-sm text-muted-foreground max-w-sm'>{description}</p>
      {action && (
        <Button variant='outline' size='sm' className='mt-4' onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// -- Add/Edit Task Dialog Form ----------------------------------------
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

  // Derive initial values from task prop directly
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
          <DialogTitle>{isEditing ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='task-title'>Title *</Label>
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

          <div className='space-y-2'>
            <Label htmlFor='task-desc'>Description</Label>
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
            <div className='space-y-2'>
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Task['priority'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Low</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
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

          <div className='space-y-2'>
            <Label htmlFor='task-due'>Due Date</Label>
            <Input
              id='task-due'
              type='date'
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {isEditing ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Main Component ---------------------------------------------------
export default function TasksView() {
  const tasks = useStore((s) => s.tasks);
  const deleteTask = useStore((s) => s.deleteTask);

  const [activeTab, setActiveTab] = useState('today');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Compute tab groups
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

  // -- Sort tasks by priority then due date
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
    <div className='p-4 md:p-6 max-w-4xl mx-auto space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Tasks</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            {tasks.filter((t) => !t.completed).length} remaining,
            {' '}{doneTasks.length} completed
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setDialogOpen(true);
          }}
          size='sm'
          className='gap-1.5'
        >
          <Plus className='h-4 w-4' />
          <span className='hidden sm:inline'>Add Task</span>
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className='overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'>
          <TabsList className='inline-flex w-auto min-w-0'>
            <TabsTrigger value='today' className='gap-1.5'>
              <Inbox className='h-3.5 w-3.5 hidden sm:block' />
              Today
              {todayTasks.length > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 h-5 min-w-5 px-1.5 text-[10px]'
                >
                  {todayTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='overdue' className='gap-1.5'>
              <AlertTriangle className='h-3.5 w-3.5 hidden sm:block' />
              Overdue
              {overdueTasks.length > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 h-5 min-w-5 px-1.5 text-[10px]'
                >
                  {overdueTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='upcoming' className='gap-1.5'>
              <CalendarDays className='h-3.5 w-3.5 hidden sm:block' />
              Upcoming
              {upcomingTasks.length > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 h-5 min-w-5 px-1.5 text-[10px]'
                >
                  {upcomingTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='someday' className='gap-1.5'>
              <Sparkles className='h-3.5 w-3.5 hidden sm:block' />
              Someday
              {somedayTasks.length > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 h-5 min-w-5 px-1.5 text-[10px]'
                >
                  {somedayTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='done' className='gap-1.5'>
              <CheckCheck className='h-3.5 w-3.5 hidden sm:block' />
              Done
              {doneTasks.length > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1 h-5 min-w-5 px-1.5 text-[10px]'
                >
                  {doneTasks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* All tabs share the same rendering - we use a single list with AnimatePresence */}
        {['today', 'overdue', 'upcoming', 'someday', 'done'].map((tab) => (
          <TabsContent key={tab} value={tab} className='mt-4'>
            {tabData[tab].tasks.length === 0 ? (
              <EmptyState
                icon={tabData[tab].emptyIcon}
                title={tabData[tab].emptyTitle}
                description={tabData[tab].emptyDesc}
                action={tabData[tab].emptyAction}
              />
            ) : (
              <motion.div
                variants={container}
                initial='hidden'
                animate='show'
                className='space-y-2'
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
