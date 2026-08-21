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
  AlertCircle,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

import { useStore } from '@/lib/store';
import type { Exam, PYQ } from '@/lib/types';
import { GRADE_FROM_PERCENTAGE } from '@/lib/types';

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

function examTypeConfig(type: Exam['type']) {
  switch (type) {
    case 'midsem':
      return { label: 'Mid-Sem', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 border-violet-200 dark:border-violet-900' };
    case 'endsem':
      return { label: 'End-Sem', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-900' };
    case 'quiz':
      return { label: 'Quiz', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-900' };
    case 'practical':
      return { label: 'Practical', className: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400 border-teal-200 dark:border-teal-900' };
    case 'other':
      return { label: 'Other', className: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400 border-gray-200 dark:border-gray-900' };
  }
}

function difficultyConfig(difficulty?: PYQ['difficulty']) {
  switch (difficulty) {
    case 'easy':
      return { label: 'Easy', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' };
    case 'medium':
      return { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' };
    case 'hard':
      return { label: 'Hard', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' };
    default:
      return null;
  }
}

// -- Empty State ------------------------------------------------------
function EmptyState({ icon: Icon, title, description, action }: {
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
            <Label>Subject *</Label>
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
            <Label htmlFor='exam-name'>Exam Name *</Label>
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
              <Label htmlFor='exam-date'>Date *</Label>
              <Input
                id='exam-date'
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Type</Label>
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
              <Label htmlFor='exam-marks'>Total Marks *</Label>
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
              <Label>Status</Label>
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
              <Label htmlFor='exam-obtained'>Obtained Marks</Label>
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
              <Label htmlFor='pyq-year'>Year *</Label>
              <Input
                id='pyq-year'
                placeholder='e.g. 2023'
                value={year}
                onChange={(e) => setYear(e.target.value)}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label>Difficulty</Label>
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
            <Label>Topic</Label>
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
            <Label htmlFor='pyq-question'>Question *</Label>
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
            <Label htmlFor='pyq-answer'>Answer</Label>
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
      <Card className='border-primary/20'>
        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <CardTitle className='text-lg'>{exam.name}</CardTitle>
              <div className='flex items-center gap-2 flex-wrap'>
                {subject && (
                  <Badge
                    variant='outline'
                    className='text-xs'
                    style={{
                      borderColor: subject.color + '60',
                      color: subject.color,
                    }}
                  >
                    {subject.code}
                  </Badge>
                )}
                <Badge variant='outline' className={`text-xs border ${typeConf.className}`}>
                  {typeConf.label}
                </Badge>
                <Badge variant='outline' className='text-xs'>
                  {exam.totalMarks} marks
                </Badge>
                <span className='text-xs text-muted-foreground flex items-center gap-1'>
                  <CalendarDays className='h-3 w-3' />
                  {format(parseISO(exam.date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Button variant='ghost' size='sm' onClick={onCollapse}>
                <ChevronDown className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-destructive hover:text-destructive'
                onClick={() => setDeleteId('exam')}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>

          {/* Completed stats row */}
          {exam.status === 'completed' && percentage !== null && (
            <div className='flex items-center gap-4 mt-3'>
              <div className='text-sm'>
                <span className='font-semibold'>{exam.obtainedMarks}</span>
                <span className='text-muted-foreground'> / {exam.totalMarks}</span>
              </div>
              <Badge variant='outline' className='text-xs'>{percentage}%</Badge>
              {grade && (
                <Badge className='text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'>
                  {grade}
                </Badge>
              )}
            </div>
          )}

          {/* Upcoming days remaining */}
          {exam.status === 'upcoming' && (
            <div className='mt-2'>
              <Badge className='text-xs bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400'>
                UPCOMING
              </Badge>
            </div>
          )}
        </CardHeader>

        <Separator />

        <CardContent className='pt-4 space-y-6'>
          {/* PYQ Section */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-semibold flex items-center gap-2'>
                <FileText className='h-4 w-4' />
                Previous Year Questions ({examPyqs.length})
              </h3>
              <Button size='sm' variant='outline' className='gap-1.5 h-8' onClick={() => setPyqDialogOpen(true)}>
                <Plus className='h-3.5 w-3.5' />
                Add PYQ
              </Button>
            </div>

            {examPyqs.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4 text-center'>
                No previous year questions added yet.
              </p>
            ) : (
              <div className='space-y-2 max-h-96 overflow-y-auto scrollbar-thin'>
                {examPyqs.map((pyq) => {
                  const diffConf = difficultyConfig(pyq.difficulty);
                  return (
                    <div
                      key={pyq.id}
                      className='rounded-lg border border-border p-3 hover:border-primary/20 transition-colors group'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 flex-wrap mb-1'>
                            <span className='text-xs font-medium text-muted-foreground'>{pyq.year}</span>
                            {diffConf && (
                              <Badge variant='outline' className={`text-[10px] px-1.5 py-0 border-0 ${diffConf.className}`}>
                                {diffConf.label}
                              </Badge>
                            )}
                            {pyq.attempted && (
                              pyq.correct ? (
                                <Badge className='text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'>
                                  Correct
                                </Badge>
                              ) : (
                                <Badge className='text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'>
                                  Incorrect
                                </Badge>
                              )
                            )}
                            {!pyq.attempted && (
                              <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
                                Not attempted
                              </Badge>
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
                          className='h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive'
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
            <h3 className='text-sm font-semibold flex items-center gap-2 mb-3'>
              <BookOpen className='h-4 w-4' />
              Preparation Notes
            </h3>
            <Textarea
              placeholder='Add your preparation notes, key topics to revise, formulas, etc.'
              value={prepNotes}
              onChange={(e) => setPrepNotes(e.target.value)}
              onBlur={handleSaveNotes}
              rows={4}
              className='resize-none'
            />
            <p className='text-[11px] text-muted-foreground mt-1'>Auto-saves when you click away</p>
          </div>
        </CardContent>
      </Card>

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

  if (exams.length === 0) {
    return (
      <div className='p-4 md:p-6 max-w-4xl mx-auto space-y-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold tracking-tight'>Exams</h1>
          <Button size='sm' className='gap-1.5' onClick={() => setDialogOpen(true)}>
            <Plus className='h-4 w-4' />
            Add Exam
          </Button>
        </div>
        <EmptyState
          icon={GraduationCap}
          title='No exams scheduled'
          description='No exams scheduled. Add your first exam to start tracking.'
          action={{ label: 'Add Exam', onClick: () => setDialogOpen(true) }}
        />
        <AddExamDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    );
  }

  return (
    <div className='p-4 md:p-6 max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Exams</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            {upcomingExams.length} upcoming, {completedExams.length} completed
          </p>
        </div>
        <Button size='sm' className='gap-1.5' onClick={() => setDialogOpen(true)}>
          <Plus className='h-4 w-4' />
          <span className='hidden sm:inline'>Add Exam</span>
        </Button>
      </div>

      <Separator />

      {/* Upcoming Exams */}
      <section>
        <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
          Upcoming Exams
        </h2>

        {upcomingExams.length === 0 ? (
          <p className='text-sm text-muted-foreground py-8 text-center'>No upcoming exams.</p>
        ) : (
          <motion.div variants={container} initial='hidden' animate='show' className='space-y-2'>
            {upcomingExams.map((exam) => {
              const subject = subjects.find((s) => s.id === exam.subjectId);
              const typeConf = examTypeConfig(exam.type);
              const daysRemaining = differenceInDays(parseISO(exam.date), new Date());
              const isExpanded = expandedId === exam.id;

              return (
                <motion.div key={exam.id} variants={fadeUp}>
                  {isExpanded ? (
                    <ExamDetail exam={exam} onCollapse={() => setExpandedId(null)} />
                  ) : (
                    <Card
                      className='group cursor-pointer transition-colors hover:border-primary/30'
                      onClick={() => setExpandedId(exam.id)}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium text-sm'>{exam.name}</p>
                            <div className='flex items-center gap-2 mt-2 flex-wrap'>
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
                              <Badge variant='outline' className={`text-[10px] px-1.5 py-0 border ${typeConf.className}`}>
                                {typeConf.label}
                              </Badge>
                              <Badge className='text-[10px] px-1.5 py-0 bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400'>
                                UPCOMING
                              </Badge>
                            </div>
                          </div>

                          <div className='flex flex-col items-end gap-2 shrink-0'>
                            <div className='text-right'>
                              <p className='text-xs text-muted-foreground flex items-center gap-1'>
                                <CalendarDays className='h-3 w-3' />
                                {format(parseISO(exam.date), 'MMM d')}
                              </p>
                              <p className={`text-xs font-medium mt-0.5 ${daysRemaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                {daysRemaining === 0 ? 'Today' : daysRemaining === 1 ? 'Tomorrow' : `${daysRemaining} days left`}
                              </p>
                            </div>
                            <Badge variant='outline' className='text-[10px]'>
                              {exam.totalMarks} marks
                            </Badge>
                          </div>
                        </div>

                        {/* Prepare Now button */}
                        <div className='mt-3 flex justify-end'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-8 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={(e) => {
                              e.stopPropagation();
                              selectSubject(exam.subjectId);
                              navigate('subject-detail');
                            }}
                          >
                            <Target className='h-3.5 w-3.5' />
                            Prepare Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* Completed Exams */}
      <section>
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger className='flex items-center gap-2 w-full group cursor-pointer py-1'>
            <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              Completed Exams ({completedExams.length})
            </h2>
            {completedOpen ? (
              <ChevronDown className='h-4 w-4 text-muted-foreground' />
            ) : (
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            {completedExams.length === 0 ? (
              <p className='text-sm text-muted-foreground py-8 text-center'>No completed exams.</p>
            ) : (
              <motion.div variants={container} initial='hidden' animate='show' className='space-y-2 mt-3'>
                {completedExams.map((exam) => {
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
                        <Card
                          className='group cursor-pointer transition-colors hover:border-primary/30 opacity-80'
                          onClick={() => setExpandedId(exam.id)}
                        >
                          <CardContent className='p-4'>
                            <div className='flex items-center justify-between gap-3'>
                              <div className='flex-1 min-w-0'>
                                <p className='font-medium text-sm'>{exam.name}</p>
                                <div className='flex items-center gap-2 mt-2 flex-wrap'>
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
                                  <Badge variant='outline' className={`text-[10px] px-1.5 py-0 border ${typeConf.className}`}>
                                    {typeConf.label}
                                  </Badge>
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
                                      <Badge variant='outline' className='text-[10px]'>
                                        {percentage}%
                                      </Badge>
                                      {grade && (
                                        <Badge className='text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'>
                                          {grade}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>

      <AddExamDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}