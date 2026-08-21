'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  BarChart3,
  Target,
  Award,
  BookOpen,
  ArrowRight,
  Trash2,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import {
  getSubjectMarks,
  getSubjectGrade,
  calculateSGPA,
  calculateCGPA,
} from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Assessment } from '@/lib/types';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// -- Category config --------------------------------------------------
const CATEGORY_CONFIG: Record<
  Assessment['category'],
  { label: string; color: string; bgClass: string }
> = {
  ca_test: { label: 'CA Test', color: '#E5484D', bgClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  assignment: { label: 'Assignment', color: '#D99200', bgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  quiz: { label: 'Quiz', color: '#8B5CF6', bgClass: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400' },
  practical: { label: 'Practical', color: '#16A36A', bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  other: { label: 'Other', color: '#737373', bgClass: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400' },
};

// -- Progress bar color helper ----------------------------------------
function progressColor(value: number): string {
  if (value >= 75) return '[&>div]:bg-emerald-500';
  if (value >= 60) return '[&>div]:bg-teal-500';
  if (value >= 50) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

// -- Main component ---------------------------------------------------
export default function MarksView() {
  const {
    subjects,
    assessments,
    profile,
    navigate,
    selectSubject,
    addAssessment,
    deleteAssessment,
  } = useStore();

  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formSubject, setFormSubject] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Assessment['category']>('ca_test');
  const [formMaxMarks, setFormMaxMarks] = useState('');
  const [formObtained, setFormObtained] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Assessment list filter/sort
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const sgpa = useMemo(() => calculateSGPA({ subjects, assessments }), [subjects, assessments]);
  const cgpa = useMemo(() => calculateCGPA({ subjects, assessments }), [subjects, assessments]);

  const filteredAssessments = useMemo(() => {
    let list = [...assessments];
    if (filterSubject !== 'all') {
      list = list.filter((a) => a.subjectId === filterSubject);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [assessments, filterSubject]);

  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name;
  const getSubjectColor = (id: string) => subjects.find((s) => s.id === id)?.color;

  const openAddDialog = () => {
    setFormSubject('');
    setFormName('');
    setFormCategory('ca_test');
    setFormMaxMarks('');
    setFormObtained('');
    setFormDate('');
    setFormNotes('');
    setDialogOpen(true);
  };

  const handleAdd = () => {
    if (!formSubject || !formName.trim() || !formMaxMarks || !formDate) return;
    addAssessment({
      subjectId: formSubject,
      name: formName.trim(),
      category: formCategory,
      maxMarks: Number(formMaxMarks),
      obtainedMarks: Number(formObtained) || 0,
      date: formDate,
      notes: formNotes.trim(),
    });
    setDialogOpen(false);
  };

  const goToSubjectMarks = (subjectId: string) => {
    selectSubject(subjectId);
    // Navigate to subject-detail with marks tab — the subject-detail view will show the marks tab
    navigate('subject-detail');
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
          <h1 className='text-2xl font-semibold tracking-tight'>Marks & CA</h1>
          <p className='text-muted-foreground text-sm mt-1'>Track your academic performance</p>
        </div>
        <Button onClick={openAddDialog} className='w-full sm:w-auto'>
          <Plus className='h-4 w-4 mr-2' />
          Add Assessment
        </Button>
      </motion.div>

      {/* SGPA / CGPA Cards */}
      <motion.div
        variants={container}
        initial='hidden'
        animate='show'
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8'
      >
        {/* SGPA */}
        <motion.div variants={fadeUp}>
          <Card className='border-primary/20'>
            <CardContent className='pt-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-muted-foreground'>Current SGPA</p>
                  <p className='text-3xl font-bold mt-1'>{sgpa.toFixed(2)}</p>
                  <p className='text-xs text-muted-foreground mt-1'>Semester {profile.semester}</p>
                </div>
                <div className='h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center'>
                  <BarChart3 className='h-6 w-6 text-primary' />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CGPA */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-muted-foreground'>Current CGPA</p>
                  <p className='text-3xl font-bold mt-1'>{cgpa.toFixed(2)}</p>
                  <div className='flex items-center gap-1.5 mt-1'>
                    {cgpa >= profile.targetCGPA ? (
                      <TrendingUp className='h-3.5 w-3.5 text-emerald-500' />
                    ) : cgpa < profile.targetCGPA - 0.5 ? (
                      <TrendingDown className='h-3.5 w-3.5 text-red-500' />
                    ) : (
                      <Minus className='h-3.5 w-3.5 text-amber-500' />
                    )}
                    <span
                      className={`text-xs ${
                        cgpa >= profile.targetCGPA
                          ? 'text-emerald-600'
                          : cgpa < profile.targetCGPA - 0.5
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {cgpa >= profile.targetCGPA
                        ? `Above target by ${(cgpa - profile.targetCGPA).toFixed(2)}`
                        : `${(profile.targetCGPA - cgpa).toFixed(2)} below target`}
                    </span>
                  </div>
                </div>
                <div className='h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center'>
                  <Award className='h-6 w-6 text-emerald-600 dark:text-emerald-400' />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Target CGPA */}
        <motion.div variants={fadeUp}>
          <Card className='bg-muted/50'>
            <CardContent className='pt-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-muted-foreground'>Target CGPA</p>
                  <p className='text-3xl font-bold mt-1'>{profile.targetCGPA.toFixed(1)}</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Grade point target
                  </p>
                </div>
                <div className='h-12 w-12 rounded-xl bg-muted flex items-center justify-center'>
                  <Target className='h-6 w-6 text-muted-foreground' />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Per-Subject Performance */}
      <div className='mb-8'>
        <h2 className='text-lg font-semibold mb-4'>Subject Performance</h2>
        {activeSubjects.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center'>
              <BookOpen className='h-10 w-10 mx-auto text-muted-foreground/40 mb-3' />
              <p className='text-sm text-muted-foreground'>No subjects yet. Add a subject to track marks.</p>
              <Button variant='outline' size='sm' className='mt-4' onClick={() => navigate('subjects')}>
                Go to Subjects
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={container}
            initial='hidden'
            animate='show'
            className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
          >
            {activeSubjects.map((subject) => {
              const marks = getSubjectMarks({ assessments }, subject.id);
              const grade = getSubjectGrade({ assessments }, subject.id);

              return (
                <motion.div key={subject.id} variants={fadeUp}>
                  <Card
                    className='cursor-pointer hover:border-primary/30 transition-all group'
                    onClick={() => goToSubjectMarks(subject.id)}
                  >
                    {/* Color bar */}
                    <div className='h-1.5 rounded-t-lg' style={{ backgroundColor: subject.color }} />
                    <CardContent className='pt-4'>
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex-1 min-w-0'>
                          <p className='font-medium truncate'>{subject.name}</p>
                          <p className='text-xs text-muted-foreground'>{subject.code} | {subject.credits} credits</p>
                        </div>
                        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <ArrowRight className='h-4 w-4 text-muted-foreground' />
                        </div>
                      </div>

                      {/* Marks */}
                      <div className='flex items-end justify-between mb-3'>
                        <div>
                          <span className='text-2xl font-bold'>{marks.obtained}</span>
                          <span className='text-muted-foreground text-sm'> / {marks.max}</span>
                        </div>
                        <span className='text-lg font-bold'>{marks.percentage}%</span>
                      </div>

                      {/* Progress bar */}
                      <Progress value={marks.percentage} className={`h-2 mb-3 ${progressColor(marks.percentage)}`} />

                      {/* Grade badges */}
                      <div className='flex items-center justify-between'>
                        <Badge variant='outline' className='font-mono text-xs'>
                          Grade: {grade}
                        </Badge>
                        {subject.targetGrade && (
                          <span className='text-xs text-muted-foreground'>
                            Target: {subject.targetGrade}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* All Recent Assessments */}
      <div>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
          <h2 className='text-lg font-semibold'>All Assessments</h2>
          <div className='flex items-center gap-2'>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className='w-[180px] h-9'>
                <SelectValue placeholder='Filter by subject' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Subjects</SelectItem>
                {activeSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className='py-12 text-center'>
              <BarChart3 className='h-10 w-10 mx-auto text-muted-foreground/40 mb-3' />
              <p className='text-sm text-muted-foreground'>No assessments recorded yet.</p>
              <Button variant='outline' size='sm' className='mt-4' onClick={openAddDialog}>
                <Plus className='h-3.5 w-3.5 mr-1.5' />
                Add Your First Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden md:block'>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className='text-right'>Marks</TableHead>
                      <TableHead className='text-right'>%</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className='w-10'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssessments.map((a) => {
                      const pct = a.maxMarks > 0 ? Math.round((a.obtainedMarks / a.maxMarks) * 100) : 0;
                      const catCfg = CATEGORY_CONFIG[a.category];
                      const subColor = getSubjectColor(a.subjectId);
                      const subName = getSubjectName(a.subjectId);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              {subColor && (
                                <span className='h-2.5 w-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: subColor }} />
                              )}
                              <span className='text-sm font-medium'>{subName}</span>
                            </div>
                          </TableCell>
                          <TableCell className='font-medium'>{a.name}</TableCell>
                          <TableCell>
                            <Badge variant='secondary' className={`text-[10px] ${catCfg.bgClass}`}>
                              {catCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right font-mono text-sm'>
                            {a.obtainedMarks} / {a.maxMarks}
                          </TableCell>
                          <TableCell className='text-right font-mono text-sm font-medium'>
                            <span className={pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}>
                              {pct}%
                            </span>
                          </TableCell>
                          <TableCell className='text-muted-foreground text-sm'>
                            {format(parseISO(a.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 text-muted-foreground hover:text-red-500'
                              onClick={() => deleteAssessment(a.id)}
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className='md:hidden space-y-3'>
              {filteredAssessments.map((a) => {
                const pct = a.maxMarks > 0 ? Math.round((a.obtainedMarks / a.maxMarks) * 100) : 0;
                const catCfg = CATEGORY_CONFIG[a.category];
                const subColor = getSubjectColor(a.subjectId);
                const subName = getSubjectName(a.subjectId);
                return (
                  <Card key={a.id} className='group'>
                    <CardContent className='pt-4'>
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          {subColor && (
                            <span className='h-2.5 w-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: subColor }} />
                          )}
                          <span className='text-sm text-muted-foreground truncate'>{subName}</span>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 flex-shrink-0'
                          onClick={() => deleteAssessment(a.id)}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                      <p className='font-medium mb-2'>{a.name}</p>
                      <div className='flex items-center gap-2 mb-3'>
                        <Badge variant='secondary' className={`text-[10px] ${catCfg.bgClass}`}>
                          {catCfg.label}
                        </Badge>
                        <span className='text-xs text-muted-foreground'>
                          {format(parseISO(a.date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <div className='flex items-end justify-between'>
                        <span className='text-lg font-bold'>{a.obtainedMarks} <span className='text-sm font-normal text-muted-foreground'>/ {a.maxMarks}</span></span>
                        <span className={`text-sm font-bold ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {pct}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Assessment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Assessment</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='assess-subject'>Subject</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger id='assess-subject'>
                  <SelectValue placeholder='Select subject' />
                </SelectTrigger>
                <SelectContent>
                  {activeSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='assess-name'>Name</Label>
              <Input
                id='assess-name'
                placeholder='e.g. CA Test 1'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='assess-category'>Category</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as Assessment['category'])}>
                  <SelectTrigger id='assess-category'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='assess-date'>Date</Label>
                <Input
                  id='assess-date'
                  type='date'
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='assess-max'>Max Marks</Label>
                <Input
                  id='assess-max'
                  type='number'
                  min='0'
                  placeholder='30'
                  value={formMaxMarks}
                  onChange={(e) => setFormMaxMarks(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='assess-obtained'>Obtained Marks</Label>
                <Input
                  id='assess-obtained'
                  type='number'
                  min='0'
                  placeholder='24'
                  value={formObtained}
                  onChange={(e) => setFormObtained(e.target.value)}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='assess-notes'>Notes</Label>
              <Textarea
                id='assess-notes'
                placeholder='Optional notes...'
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formSubject || !formName.trim() || !formMaxMarks || !formDate}>
              Add Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
