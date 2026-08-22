'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CalendarDays,
  Clock,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Trash2,
  Target,
  FileText,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

import { useStore } from '@/lib/store';
import type { Exam, PYQ } from '@/lib/types';
import { GRADE_FROM_PERCENTAGE } from '@/lib/types';

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  PageHeader,
  EmptyState,
  SectionHeader,
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

function examTypeConfig(type: Exam['type']) {
  switch (type) {
    case 'midsem':
      return { label: 'Mid-Sem', signalClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' };
    case 'endsem':
      return { label: 'End-Sem', signalClass: 'signal-critical' };
    case 'quiz':
      return { label: 'Quiz', signalClass: 'signal-attention' };
    case 'practical':
      return { label: 'Practical', signalClass: 'signal-healthy' };
    case 'other':
      return { label: 'Other', signalClass: 'bg-secondary text-muted-foreground' };
  }
}

function difficultyConfig(difficulty?: PYQ['difficulty']) {
  switch (difficulty) {
    case 'easy':
      return { label: 'Easy', className: 'signal-healthy' };
    case 'medium':
      return { label: 'Medium', className: 'signal-attention' };
    case 'hard':
      return { label: 'Hard', className: 'signal-critical' };
    default:
      return null;
  }
}

// -- Add Exam Dialog --------------------------------------------------
function AddExamDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addExam = useStore((s) => s.addExam);
  const subjects = useStore((s) => s.subjects);
  const activeSubjects = subjects.filter((s) => !s.archived);

  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<Exam['type']>('midsem');
  const [totalMarks, setTotalMarks] = useState('');
  const [status, setStatus] = useState<Exam['status']>('upcoming');
  const [obtainedMarks, setObtainedMarks] = useState('');

  const handleSubmit = () => {
    if (!subjectId || !name.trim() || !date || !totalMarks) return;

    const examData: Omit<Exam, 'id' | 'createdAt'> = {
      subjectId,
      name: name.trim(),
      date,
      type,
      totalMarks: Number(totalMarks),
      status,
      obtainedMarks: status === 'completed' && obtainedMarks ? Number(obtainedMarks) : undefined,
    };

    addExam(examData);
    onOpenChange(false);

    // Reset form
    setSubjectId('');
    setName('');
    setDate('');
    setType('midsem');
    setTotalMarks('');
    setStatus('upcoming');
    setObtainedMarks('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); }}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add Exam</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
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
            <Label htmlFor='exam-name' className='section-label'>Exam Name</Label>
            <Input
              id='exam-name'
              placeholder='e.g. Mid-Semester Examination'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='exam-date' className='section-label'>Date</Label>
              <Input
                id='exam-date'
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label className='section-label'>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Exam['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='midsem'>Mid-Semester</SelectItem>
                  <SelectItem value='endsem'>End-Semester</SelectItem>
                  <SelectItem value='quiz'>Quiz</SelectItem>
                  <SelectItem value='practical'>Practical</SelectItem>
                  <SelectItem value='other'>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='exam-marks' className='section-label'>Total Marks</Label>
              <Input
                id='exam-marks'
                type='number'
                min='1'
                placeholder='100'
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label className='section-label'>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Exam['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='upcoming'>Upcoming</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === 'completed' && (
            <div className='space-y-2'>
              <Label htmlFor='exam-obtained' className='section-label'>Obtained Marks</Label>
              <Input
                id='exam-obtained'
                type='number'
                min='0'
                placeholder='Obtained marks (optional)'
                value={obtainedMarks}
                onChange={(e) => setObtainedMarks(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!subjectId || !name.trim() || !date || !totalMarks}>
            Add Exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Add PYQ Dialog ---------------------------------------------------
function AddPYQDialog({ examId, subjectId, open, onOpenChange }: {
  examId: string;
  subjectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addPYQ = useStore((s) => s.addPYQ);
  const syllabusUnits = useStore((s) => s.syllabusUnits);

  const allTopics = useMemo(
    () => syllabusUnits.filter((u) => u.subjectId === subjectId).flatMap((u) => u.topics),
    [syllabusUnits, subjectId]
  );

  const [year, setYear] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [topicId, setTopicId] = useState('none');
  const [difficulty, setDifficulty] = useState<PYQ['difficulty']>('medium');
  const [attempted, setAttempted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const handleSubmit = () => {
    if (!year.trim() || !question.trim()) return;

    addPYQ({
      examId,
      subjectId,
      year: year.trim(),
      question: question.trim(),
      answer: answer.trim() || undefined,
      topicId: topicId === 'none' ? undefined : topicId,
      difficulty,
      attempted,
      correct: attempted ? correct : undefined,
    });

    onOpenChange(false);
    setYear('');
    setQuestion('');
    setAnswer('');
    setTopicId('none');
    setDifficulty('medium');
    setAttempted(false);
    setCorrect(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Add Previous Year Question</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='pyq-year' className='section-label'>Year</Label>
              <Input
                id='pyq-year'
                placeholder='e.g. 2023'
                value={year}
                onChange={(e) => setYear(e.target.value)}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label className='section-label'>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as PYQ['difficulty'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='easy'>Easy</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='hard'>Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='section-label'>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue placeholder='Select topic (optional)' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>None</SelectItem>
                {allTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='pyq-question' className='section-label'>Question</Label>
            <Textarea
              id='pyq-question'
              placeholder='Enter the question...'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className='resize-none'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='pyq-answer' className='section-label'>Answer</Label>
            <Textarea
              id='pyq-answer'
              placeholder='Enter the answer (optional)...'
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              className='resize-none'
            />
          </div>

          <div className='flex items-center gap-6'>
            <label className='flex items-center gap-2 text-sm cursor-pointer'>
              <input
                type='checkbox'
                checked={attempted}
                onChange={(e) => setAttempted(e.target.checked)}
                className='rounded border-gray-300'
              />
              Attempted
            </label>
            {attempted && (
              <label className='flex items-center gap-2 text-sm cursor-pointer'>
                <input
                  type='checkbox'
                  checked={correct}
                  onChange={(e) => setCorrect(e.target.checked)}
                  className='rounded border-gray-300'
                />
                Correct
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!year.trim() || !question.trim()}>
            Add PYQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Exam Detail (expanded) -------------------------------------------
function ExamDetail({
  exam,
  onCollapse,
}: {
  exam: Exam;
  onCollapse: () => void;
}) {
  const subjects = useStore((s) => s.subjects);
  const pyqs = useStore((s) => s.pyqs);
  const updateExam = useStore((s) => s.updateExam);
  const deletePYQ = useStore((s) => s.deletePYQ);
  const deleteExam = useStore((s) => s.deleteExam);

  const subject = subjects.find((s) => s.id === exam.subjectId);
  const examPyqs = pyqs.filter((p) => p.examId === exam.id);
  const typeConf = examTypeConfig(exam.type);

  const [prepNotes, setPrepNotes] = useState(exam.preparationNotes ?? '');
  const [pyqDialogOpen, setPyqDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSaveNotes = () => {
    updateExam(exam.id, { preparationNotes: prepNotes });
  };

  const handleDeleteExam = () => {
    deleteExam(exam.id);
    onCollapse();
  };

  const percentage =
    exam.status === 'completed' && exam.obtainedMarks !== undefined && exam.totalMarks > 0
      ? Math.round((exam.obtainedMarks / exam.totalMarks) * 100)
      : null;
  const grade = percentage !== null ? GRADE_FROM_PERCENTAGE(percentage) : null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className='overflow-hidden'
    >
      <div className='metric-card p-4 space-y-4'>
        {/* Header */}
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-2'>
            <h3 className='text-base font-semibold'>{exam.name}</h3>
            <div className='flex items-center gap-2 flex-wrap'>
              {subject && (
                <span
                  className='inline-flex items-center gap-1.5 text-[11px] font-medium'
                  style={{ color: subject.color }}
                >
                  <div className='status-dot' style={{ backgroundColor: subject.color }} />
                  {subject.code}
                </span>
              )}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${typeConf.signalClass}`}>
                {typeConf.label}
              </span>
              <span className='text-[11px] text-muted-foreground'>{exam.totalMarks} marks</span>
              <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                <CalendarDays className='h-3 w-3' />
                {format(parseISO(exam.date), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            <Button variant='ghost' size='sm' className='h-7 w-7 p-0' onClick={onCollapse}>
              <ChevronDown className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-muted-foreground hover:text-red-500'
              onClick={() => setDeleteId('exam')}
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>

        {/* Completed stats */}
        {exam.status === 'completed' && percentage !== null && (
          <div className='flex items-center gap-3'>
            <span className='text-sm font-semibold'>{exam.obtainedMarks}</span>
            <span className='text-sm text-muted-foreground'>/ {exam.totalMarks}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${percentage >= 60 ? 'signal-healthy' : percentage >= 40 ? 'signal-attention' : 'signal-critical'}`}>
              {percentage}%
            </span>
            {grade && (
              <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase signal-healthy'>
                {grade}
              </span>
            )}
          </div>
        )}

        {/* Upcoming badge */}
        {exam.status === 'upcoming' && (
          <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'>
            UPCOMING
          </span>
        )}

        {/* PYQ Section */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <span className='section-label'>Previous Year Questions ({examPyqs.length})</span>
            <Button size='sm' variant='outline' className='h-7 text-xs gap-1' onClick={() => setPyqDialogOpen(true)}>
              <Plus className='h-3 w-3' />
              Add PYQ
            </Button>
          </div>

          {examPyqs.length === 0 ? (
            <p className='text-xs text-muted-foreground py-4 text-center'>
              No previous year questions added yet.
            </p>
          ) : (
            <div className='space-y-2 max-h-96 overflow-y-auto scrollbar-thin'>
              {examPyqs.map((pyq) => {
                const diffConf = difficultyConfig(pyq.difficulty);
                return (
                  <div
                    key={pyq.id}
                    className='rounded-md border border-border p-3 hover:border-primary/25 transition-colors group'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap mb-1'>
                          <span className='text-[11px] font-medium text-muted-foreground'>{pyq.year}</span>
                          {diffConf && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase ${diffConf.className}`}>
                              {diffConf.label}
                            </span>
                          )}
                          {pyq.attempted && (
                            pyq.correct ? (
                              <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase signal-healthy'>
                                Correct
                              </span>
                            ) : (
                              <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wider uppercase signal-critical'>
                                Incorrect
                              </span>
                            )
                          )}
                          {!pyq.attempted && (
                            <span className='text-[9px] text-muted-foreground'>Not attempted</span>
                          )}
                        </div>
                        <p className='text-sm leading-relaxed'>{pyq.question}</p>
                        {pyq.answer && (
                          <p className='text-xs text-muted-foreground mt-1.5 line-clamp-2'>{pyq.answer}</p>
                        )}
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500'
                        onClick={() => setDeleteId(pyq.id)}
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preparation Notes */}
        <div>
          <span className='section-label'>Preparation Notes</span>
          <Textarea
            placeholder='Add your preparation notes, key topics to revise, formulas, etc.'
            value={prepNotes}
            onChange={(e) => setPrepNotes(e.target.value)}
            onBlur={handleSaveNotes}
            rows={4}
            className='resize-none mt-2'
          />
          <p className='text-[10px] text-muted-foreground/60 mt-1'>Auto-saves when you click away</p>
        </div>
      </div>

      <AddPYQDialog
        examId={exam.id}
        subjectId={exam.subjectId}
        open={pyqDialogOpen}
        onOpenChange={setPyqDialogOpen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteId === 'exam' ? 'Delete Exam' : 'Delete PYQ'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId === 'exam'
                ? 'Are you sure you want to delete this exam and all its PYQs? This action cannot be undone.'
                : 'Are you sure you want to delete this previous year question?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId === 'exam') {
                  handleDeleteExam();
                } else if (deleteId) {
                  deletePYQ(deleteId);
                }
                setDeleteId(null);
              }}
              className='bg-destructive text-white hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// -- Main Component ---------------------------------------------------
export default function ExamsView() {
  const exams = useStore((s) => s.exams);
  const subjects = useStore((s) => s.subjects);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'missed'>('all');

  const today = todayStr();

  const upcomingExams = useMemo(
    () =>
      exams
        .filter((e) => e.status === 'upcoming')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [exams],
  );

  const completedExams = useMemo(
    () =>
      exams
        .filter((e) => e.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [exams],
  );

  const missedExams = useMemo(
    () =>
      exams.filter((e) => e.status === 'upcoming' && e.date < today),
    [exams, today],
  );

  const filteredUpcoming = statusFilter === 'all' || statusFilter === 'upcoming' ? upcomingExams : [];
  const filteredCompleted = statusFilter === 'all' || statusFilter === 'completed' ? completedExams : [];
  const filteredMissed = statusFilter === 'all' || statusFilter === 'missed' ? missedExams : [];

  const hasFilteredResults = filteredUpcoming.length > 0 || filteredCompleted.length > 0 || filteredMissed.length > 0;

  if (exams.length === 0) {
    return (
      <div className='fab-content-pad'>
        <PageHeader
          title='Exams'
          actions={
            <Button size='sm' className='gap-1.5' onClick={() => setDialogOpen(true)}>
              <Plus className='h-4 w-4' />
              Add Exam
            </Button>
          }
        />
        <EmptyState
          icon={GraduationCap}
          title='No exams scheduled'
          description='No exams scheduled. Add your first exam to start tracking.'
          action={
            <Button variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
              Add Exam
            </Button>
          }
        />
        <AddExamDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    );
  }

  return (
    <div className='fab-content-pad'>
      {/* Header */}
      <PageHeader
        title='Exams'
        subtitle={`${upcomingExams.length} upcoming, ${completedExams.length} completed${missedExams.length > 0 ? `, ${missedExams.length} missed` : ''}`}
        actions={
          <Button size='sm' className='gap-1.5' onClick={() => setDialogOpen(true)}>
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline'>Add Exam</span>
          </Button>
        }
      />

      {/* Status Filter Pills */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.2 }}
        className='flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0'
      >
        {(['all', 'upcoming', 'completed', 'missed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              statusFilter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? `All (${exams.length})` : f === 'upcoming' ? `Upcoming (${upcomingExams.length})` : f === 'completed' ? `Completed (${completedExams.length})` : `Missed (${missedExams.length})`}
          </button>
        ))}
      </motion.div>

      {/* Upcoming Exams */}
      {(statusFilter === 'all' || statusFilter === 'upcoming') && (
      <section>
        <SectionHeader title='Upcoming Exams' />

        {filteredUpcoming.length === 0 && statusFilter !== 'completed' && statusFilter !== 'missed' ? (
          <EmptyState
            icon={CalendarDays}
            title='No upcoming exams'
            description='All exams have been completed.'
          />
        ) : filteredUpcoming.length === 0 ? null : (
          <motion.div variants={container} initial='hidden' animate='show' className='space-y-2 stagger-children'>
            {filteredUpcoming.map((exam) => {
              const subject = subjects.find((s) => s.id === exam.subjectId);
              const typeConf = examTypeConfig(exam.type);
              const daysRemaining = differenceInDays(parseISO(exam.date), new Date());
              const isExpanded = expandedId === exam.id;

              return (
                <motion.div key={exam.id} variants={fadeUp}>
                  {isExpanded ? (
                    <ExamDetail exam={exam} onCollapse={() => setExpandedId(null)} />
                  ) : (
                    <div
                      className={cn(
                        'card-interactive p-4 group',
                        daysRemaining <= 2 && 'border-l-2 border-l-red-500',
                        daysRemaining > 2 && daysRemaining <= 7 && 'border-l-2 border-l-amber-500',
                      )}
                      onClick={() => setExpandedId(exam.id)}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium'>{exam.name}</p>
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
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${typeConf.signalClass}`}>
                              {typeConf.label}
                            </span>
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase',
                              daysRemaining <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                              daysRemaining <= 2 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                              daysRemaining <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                              'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                            )}>
                              {daysRemaining <= 0 ? 'Today' : daysRemaining === 1 ? 'Tomorrow' : `In ${daysRemaining}d`}
                            </span>
                          </div>
                        </div>

                        <div className='flex flex-col items-end gap-2 shrink-0'>
                          <div className='text-right'>
                            <p className='text-[11px] text-muted-foreground flex items-center gap-1'>
                              <CalendarDays className='h-3 w-3' />
                              {format(parseISO(exam.date), 'MMM d')}
                            </p>
                          </div>
                          <span className='text-[10px] text-muted-foreground'>{exam.totalMarks} marks</span>
                        </div>
                      </div>

                      {/* Prepare Now */}
                      <div className='mt-3 flex justify-end'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity'
                          onClick={(e) => {
                            e.stopPropagation();
                            selectSubject(exam.subjectId);
                            navigate('subject-detail');
                          }}
                        >
                          <Target className='h-3 w-3' />
                          Prepare Now
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
      )}

      {/* Missed Exams */}
      {(statusFilter === 'all' || statusFilter === 'missed') && missedExams.length > 0 && (
      <section>
        <SectionHeader title={`Missed Exams (${missedExams.length})`} />
        <motion.div variants={container} initial='hidden' animate='show' className='space-y-2 stagger-children'>
          {missedExams.map((exam) => {
            const subject = subjects.find((s) => s.id === exam.subjectId);
            const typeConf = examTypeConfig(exam.type);
            return (
              <motion.div key={exam.id} variants={fadeUp}>
                <div className='card-interactive p-4 group opacity-60 border-l-2 border-l-red-500' onClick={() => setExpandedId(exam.id)}>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium'>{exam.name}</p>
                      <div className='flex items-center gap-2 mt-2 flex-wrap'>
                        {subject && (
                          <span className='inline-flex items-center gap-1.5 text-[10px] font-medium' style={{ color: subject.color }}>
                            <div className='status-dot' style={{ backgroundColor: subject.color }} />
                            {subject.code}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${typeConf.signalClass}`}>
                          {typeConf.label}
                        </span>
                        <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase signal-critical'>
                          MISSED
                        </span>
                      </div>
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='text-[11px] text-muted-foreground flex items-center gap-1'>
                        <CalendarDays className='h-3 w-3' />
                        {format(parseISO(exam.date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
      )}

      {/* Completed Exams */}
      {(statusFilter === 'all' || statusFilter === 'completed') && (
      <section>
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger className='flex items-center gap-2 w-full group cursor-pointer py-1'>
            <SectionHeader
              title={`Completed Exams (${completedExams.length})`}
              className='mb-0'
            />
            {completedOpen ? (
              <ChevronDown className='h-4 w-4 text-muted-foreground' />
            ) : (
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            {filteredCompleted.length === 0 ? null : (
              <motion.div variants={container} initial='hidden' animate='show' className='space-y-2 mt-3 stagger-children'>
                {filteredCompleted.map((exam) => {
                  const subject = subjects.find((s) => s.id === exam.subjectId);
                  const typeConf = examTypeConfig(exam.type);
                  const percentage =
                    exam.obtainedMarks !== undefined && exam.totalMarks > 0
                      ? Math.round((exam.obtainedMarks / exam.totalMarks) * 100)
                      : null;
                  const grade = percentage !== null ? GRADE_FROM_PERCENTAGE(percentage) : null;
                  const isExpanded = expandedId === exam.id;

                  return (
                    <motion.div key={exam.id} variants={fadeUp}>
                      {isExpanded ? (
                        <ExamDetail exam={exam} onCollapse={() => setExpandedId(null)} />
                      ) : (
                        <div
                          className='card-interactive p-4 group opacity-75'
                          onClick={() => setExpandedId(exam.id)}
                        >
                          <div className='flex items-center justify-between gap-3'>
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium'>{exam.name}</p>
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
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${typeConf.signalClass}`}>
                                  {typeConf.label}
                                </span>
                                <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                                  <CalendarDays className='h-3 w-3' />
                                  {format(parseISO(exam.date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-3 shrink-0'>
                              {percentage !== null && (
                                <div className='text-right'>
                                  <p className='text-sm font-semibold'>
                                    {exam.obtainedMarks}<span className='text-muted-foreground font-normal'>/{exam.totalMarks}</span>
                                  </p>
                                  <div className='flex items-center gap-1.5 justify-end mt-0.5'>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${percentage >= 60 ? 'signal-healthy' : percentage >= 40 ? 'signal-attention' : 'signal-critical'}`}>
                                      {percentage}%
                                    </span>
                                    {grade && (
                                      <span className='inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase signal-healthy'>
                                        {grade}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>
      )}

      {/* No results for filter */}
      {statusFilter !== 'all' && !hasFilteredResults && (
        <EmptyState
          icon={GraduationCap}
          title={`No ${statusFilter} exams`}
          description={statusFilter === 'upcoming' ? 'No upcoming exams found.' : statusFilter === 'completed' ? 'No completed exams found.' : 'No missed exams found.'}
        />
      )}

      <AddExamDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
