'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  Trash2,
  Inbox,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

import { useStore } from '@/lib/store';
import type { Assignment } from '@/lib/types';

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
} from '@/components/shared';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// -- Helpers ----------------------------------------------------------
const todayStr = () => new Date().toISOString().split('T')[0];

function formatDeadline(dateStr: string): string {
  const today = todayStr();
  const date = parseISO(dateStr);
  const diff = differenceInDays(date, new Date());

  if (dateStr === today) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `In ${diff} days`;
  if (diff < -1) return `${Math.abs(diff)} days ago`;
  return format(date, 'MMM d');
}

function priorityConfig(priority: Assignment['priority']) {
  switch (priority) {
    case 'high':
      return { label: 'HIGH', signalClass: 'signal-attention' };
    case 'medium':
      return { label: 'MEDIUM', signalClass: 'bg-secondary text-muted-foreground' };
    case 'low':
      return { label: 'LOW', signalClass: 'signal-healthy' };
  }
}

function statusConfig(status: Assignment['status']) {
  switch (status) {
    case 'upcoming':
      return { label: 'Upcoming', signalClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' };
    case 'due_soon':
      return { label: 'Due Soon', signalClass: 'signal-attention' };
    case 'overdue':
      return { label: 'Overdue', signalClass: 'signal-critical' };
    case 'completed':
      return { label: 'Completed', signalClass: 'signal-healthy' };
  }
}

function getEffectiveStatus(assignment: Assignment, today: string): Assignment['status'] {
  if (assignment.status === 'completed') return 'completed';
  if (assignment.deadline < today) return 'overdue';
  const diff = differenceInDays(parseISO(assignment.deadline), new Date());
  if (diff <= 3) return 'due_soon';
  return 'upcoming';
}

function sortByPriorityAndDeadline(list: Assignment[]): Assignment[] {
  const prio = { high: 0, medium: 1, low: 2 };
  return [...list].sort((a, b) => {
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority];
    return a.deadline.localeCompare(b.deadline);
  });
}

// -- Assignment Card --------------------------------------------------
function AssignmentCard({
  assignment,
  onComplete,
  onDelete,
}: {
  assignment: Assignment;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const subjects = useStore((s) => s.subjects);
  const subject = subjects.find((s) => s.id === assignment.subjectId);
  const p = priorityConfig(assignment.priority);
  const s = statusConfig(getEffectiveStatus(assignment, todayStr()));
  const [expanded, setExpanded] = useState(false);

  const progress =
    assignment.maxMarks && assignment.maxMarks > 0 && assignment.obtainedMarks !== undefined
      ? Math.round((assignment.obtainedMarks / assignment.maxMarks) * 100)
      : null;

  return (
    <motion.div variants={fadeUp} layout>
      <div
        className={`metric-card group p-4 ${assignment.status === 'completed' ? 'opacity-50' : ''}`}
      >
        <div className='flex items-start justify-between gap-3'>
          <div
            className='flex-1 min-w-0 cursor-pointer'
            onClick={() => setExpanded(!expanded)}
          >
            <div className='flex items-center gap-2 flex-wrap'>
              <span className={`text-sm font-medium leading-tight ${assignment.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {assignment.title}
              </span>
            </div>

            <div className='flex items-center gap-2 mt-2 flex-wrap'>
              {subject && (
                <span
                  className='inline-flex items-center gap-1.5 text-[10px] font-medium'
                  style={{ color: subject.color }}
                >
                  <div className='status-dot' style={{ backgroundColor: subject.color }} />
                  {subject.code}
                </span>
              )}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${p.signalClass}`}>
                {p.label}
              </span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${s.signalClass}`}>
                {s.label}
              </span>
            </div>

            <div className='flex items-center gap-3 mt-2'>
              <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                {formatDeadline(assignment.deadline)}
              </span>
              {progress !== null && (
                <div className='flex items-center gap-2 flex-1 min-w-0 max-w-[120px]'>
                  <div className='progress-thin flex-1'>
                    <div
                      className={progress >= 60 ? 'bg-emerald-500 dark:bg-emerald-400' : progress >= 40 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-red-500 dark:bg-red-400'}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className='text-[10px] text-muted-foreground shrink-0 tabular-nums'>{progress}%</span>
                </div>
              )}
            </div>

            {/* Expanded description */}
            <AnimatePresence>
              {expanded && assignment.description && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='overflow-hidden'
                >
                  <div className='mt-3 pt-3 border-t border-border'>
                    <p className='text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed'>{assignment.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className='flex flex-col items-end gap-2 shrink-0'>
            <span className='text-[11px] text-muted-foreground'>
              {format(parseISO(assignment.deadline), 'MMM d')}
            </span>
            <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
              {assignment.status !== 'completed' && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                  onClick={onComplete}
                >
                  <CheckCircle2 className='h-3.5 w-3.5' />
                </Button>
              )}
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 text-muted-foreground hover:text-red-500'
                onClick={onDelete}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// -- Add Assignment Dialog --------------------------------------------
function AddAssignmentDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addAssignment = useStore((s) => s.addAssignment);
  const subjects = useStore((s) => s.subjects);
  const activeSubjects = subjects.filter((s) => !s.archived);

  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Assignment['priority']>('medium');
  const [maxMarks, setMaxMarks] = useState('');

  const handleSubmit = () => {
    if (!subjectId || !title.trim() || !deadline) return;

    const today = todayStr();
    const effectiveStatus: Assignment['status'] =
      deadline < today
        ? 'overdue'
        : differenceInDays(parseISO(deadline), new Date()) <= 3
          ? 'due_soon'
          : 'upcoming';

    addAssignment({
      subjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline,
      priority,
      status: effectiveStatus,
      maxMarks: maxMarks ? Number(maxMarks) : undefined,
    });

    onOpenChange(false);
    setSubjectId('');
    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
    setMaxMarks('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add Assignment</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='assign-title' className='section-label'>Title</Label>
            <Input
              id='assign-title'
              placeholder='Assignment title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

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

          <div className='space-y-2'>
            <Label htmlFor='assign-desc' className='section-label'>Description</Label>
            <Textarea
              id='assign-desc'
              placeholder='Assignment details...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className='resize-none'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='assign-deadline' className='section-label'>Deadline</Label>
              <Input
                id='assign-deadline'
                type='date'
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label className='section-label'>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Assignment['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Low</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='assign-marks' className='section-label'>Max Marks (optional)</Label>
            <Input
              id='assign-marks'
              type='number'
              min='1'
              placeholder='e.g. 20'
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!subjectId || !title.trim() || !deadline}>
            Add Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Main Component ---------------------------------------------------
export default function AssignmentsView() {
  const assignments = useStore((s) => s.assignments);
  const updateAssignment = useStore((s) => s.updateAssignment);
  const deleteAssignment = useStore((s) => s.deleteAssignment);

  const [activeTab, setActiveTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const today = todayStr();

  // Compute effective statuses
  const assignmentsWithStatus = useMemo(
    () =>
      assignments.map((a) => ({
        ...a,
        effectiveStatus: getEffectiveStatus(a, today),
      })),
    [assignments, today],
  );

  const filterByTab = (tab: string) => {
    if (tab === 'all') return assignmentsWithStatus;
    return assignmentsWithStatus.filter((a) => a.effectiveStatus === tab);
  };

  const tabConfigs = [
    { key: 'all', label: 'All', icon: Inbox },
    { key: 'upcoming', label: 'Upcoming', icon: ClipboardList },
    { key: 'due_soon', label: 'Due Soon', icon: AlertTriangle },
    { key: 'overdue', label: 'Overdue', icon: AlertCircle },
    { key: 'completed', label: 'Done', icon: CheckCircle2 },
  ];

  const emptyMessages: Record<string, { title: string; description: string }> = {
    all: { title: 'No assignments yet', description: 'Add your first assignment to start tracking deadlines.' },
    upcoming: { title: 'No upcoming assignments', description: 'Nothing upcoming right now.' },
    due_soon: { title: 'No due soon assignments', description: 'Nothing due in the next 3 days.' },
    overdue: { title: 'No overdue assignments', description: 'You are up to date!' },
    completed: { title: 'No completed assignments', description: 'No completed assignments yet.' },
  };

  const currentList = sortByPriorityAndDeadline(filterByTab(activeTab));
  const emptyConfig = emptyMessages[activeTab];

  return (
    <div className='p-4 md:p-6 content-area space-y-4'>
      {/* Header */}
      <PageHeader
        title='Assignments'
        subtitle={`${assignmentsWithStatus.filter((a) => a.effectiveStatus === 'overdue').length} overdue, ${assignmentsWithStatus.filter((a) => a.effectiveStatus === 'completed').length} completed`}
        actions={
          <Button
            size='sm'
            className='gap-1.5'
            onClick={() => setDialogOpen(true)}
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline'>Add Assignment</span>
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className='overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'>
          <TabsList className='inline-flex w-auto min-w-0'>
            {tabConfigs.map((tab) => {
              const count = filterByTab(tab.key).length;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className='gap-1.5 text-xs'>
                  <tab.icon className='h-3.5 w-3.5 hidden sm:block' />
                  {tab.label}
                  {count > 0 && (
                    <span className='ml-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center bg-secondary text-muted-foreground'>
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {tabConfigs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className='mt-4'>
            {currentList.length === 0 ? (
              <EmptyState
                icon={tab.icon}
                title={emptyConfig.title}
                description={emptyConfig.description}
                action={
                  activeTab === 'all'
                    ? <Button variant='outline' size='sm' onClick={() => setDialogOpen(true)}>Add Assignment</Button>
                    : undefined
                }
              />
            ) : (
              <motion.div
                variants={container}
                initial='hidden'
                animate='show'
                className='grid gap-3 sm:grid-cols-2'
              >
                <AnimatePresence mode='popLayout'>
                  {currentList.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onComplete={() => {
                        updateAssignment(assignment.id, { status: 'completed' });
                      }}
                      onDelete={() => setDeleteId(assignment.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AddAssignmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteAssignment(deleteId);
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
