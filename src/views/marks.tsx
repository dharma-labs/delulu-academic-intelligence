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
  Trash2,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import {
  getSubjectMarks,
  getSubjectGrade,
  calculateSGPA,
  calculateCGPA,
} from '@/lib/store';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PageHeader,
  EmptyState,
  MetricCard,
  CompactProgress,
  SectionHeader,
} from '@/components/shared';
import type { Assessment } from '@/lib/types';

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// -- Category config --------------------------------------------------
const CATEGORY_CONFIG: Record<
  Assessment['category'],
  { label: string; color: string; signalClass: string }
> = {
  ca_test: { label: 'CA Test', color: '#EF4444', signalClass: 'signal-critical' },
  assignment: { label: 'Assignment', color: '#F59E0B', signalClass: 'signal-attention' },
  quiz: { label: 'Quiz', color: '#8B5CF6', signalClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' },
  practical: { label: 'Practical', color: '#10B981', signalClass: 'signal-healthy' },
  other: { label: 'Other', color: '#64748B', signalClass: 'bg-secondary text-muted-foreground' },
};

// -- Progress color helper ----------------------------------------
function progressColorKey(value: number): 'green' | 'blue' | 'amber' | 'red' | 'purple' {
  if (value >= 75) return 'green';
  if (value >= 60) return 'blue';
  if (value >= 50) return 'amber';
  return 'red';
}

function scoreColorClass(pct: number): string {
  if (pct >= 60) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
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
    navigate('subject-detail');
  };

  const cgpaTrend =
    cgpa >= profile.targetCGPA
      ? 'up' as const
      : cgpa < profile.targetCGPA - 0.5
        ? 'down' as const
        : 'neutral' as const;
  const cgpaTrendValue =
    cgpa >= profile.targetCGPA
      ? `+${(cgpa - profile.targetCGPA).toFixed(2)} above target`
      : `${(profile.targetCGPA - cgpa).toFixed(2)} below target`;

  return (
    <div className='p-4 md:p-6 content-area'>
      {/* Header */}
      <PageHeader
        title='Marks & CA'
        subtitle='Track your academic performance'
        actions={
          <Button onClick={openAddDialog} className='w-full sm:w-auto'>
            <Plus className='h-4 w-4 mr-2' />
            Add Assessment
          </Button>
        }
      />

      {/* SGPA / CGPA / Target Metric Cards */}
      <motion.div
        variants={container}
        initial='hidden'
        animate='show'
        className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8'
      >
        <motion.div variants={fadeUp}>
          <MetricCard
            label='Current SGPA'
            value={sgpa.toFixed(2)}
            context={`Semester ${profile.semester}`}
            icon={BarChart3}
            iconColor='text-primary'
            className='border-primary/20'
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <MetricCard
            label='Current CGPA'
            value={cgpa.toFixed(2)}
            context={`Target: ${profile.targetCGPA.toFixed(1)}`}
            trend={cgpaTrend}
            trendValue={cgpaTrendValue}
            icon={Award}
            iconColor={cgpa >= profile.targetCGPA ? 'text-emerald-500' : cgpa < profile.targetCGPA - 0.5 ? 'text-red-500' : 'text-amber-500'}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <MetricCard
            label='Target CGPA'
            value={profile.targetCGPA.toFixed(1)}
            context='Grade point target'
            icon={Target}
          />
        </motion.div>
      </motion.div>

      {/* Per-Subject Performance */}
      <SectionHeader title='Subject Performance' className='mb-4' />
      {activeSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title='No subjects yet'
          description='Add a subject to start tracking marks.'
          action={
            <Button variant='outline' size='sm' onClick={() => navigate('subjects')}>
              Go to Subjects
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={container}
          initial='hidden'
          animate='show'
          className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8'
        >
          {activeSubjects.map((subject) => {
            const marks = getSubjectMarks({ assessments }, subject.id);
            const grade = getSubjectGrade({ assessments }, subject.id);

            return (
              <motion.div key={subject.id} variants={fadeUp}>
                <div
                  className='card-interactive p-4 group'
                  onClick={() => goToSubjectMarks(subject.id)}
                >
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <div
                        className='status-dot'
                        style={{ backgroundColor: subject.color }}
                      />
                      <div className='min-w-0'>
                        <p className='text-sm font-medium truncate'>{subject.name}</p>
                        <p className='text-[11px] text-muted-foreground'>{subject.code} · {subject.credits} credits</p>
                      </div>
                    </div>
                    <span className='text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/50'>
                      {grade}
                    </span>
                  </div>

                  <div className='flex items-end justify-between mb-3'>
                    <span className='text-2xl font-bold tracking-tight'>{marks.obtained}</span>
                    <span className='text-sm text-muted-foreground'>/ {marks.max}</span>
                    <span className={`text-sm font-bold ml-auto ${scoreColorClass(marks.percentage)}`}>
                      {marks.percentage}%
                    </span>
                  </div>

                  <CompactProgress
                    label={subject.targetGrade ? `Target: ${subject.targetGrade}` : 'Progress'}
                    value={marks.percentage}
                    color={progressColorKey(marks.percentage)}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* All Assessments */}
      <SectionHeader
        title='All Assessments'
        action={
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className='w-[180px] h-8 text-xs'>
              <SelectValue placeholder='Filter by subject' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Subjects</SelectItem>
              {activeSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {filteredAssessments.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title='No assessments recorded'
          description='Add your first assessment to start tracking.'
          action={
            <Button variant='outline' size='sm' onClick={openAddDialog}>
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Add Your First Assessment
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className='hidden md:block border border-border rounded-lg bg-card overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
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
                            <div className='status-dot' style={{ backgroundColor: subColor }} />
                          )}
                          <span className='text-sm font-medium'>{subName}</span>
                        </div>
                      </TableCell>
                      <TableCell className='font-medium text-sm'>{a.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${catCfg.signalClass}`}>
                          {catCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className='text-right font-mono text-sm'>
                        {a.obtainedMarks} / {a.maxMarks}
                      </TableCell>
                      <TableCell className='text-right font-mono text-sm font-medium'>
                        <span className={scoreColorClass(pct)}>{pct}%</span>
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
          </div>

          {/* Mobile Cards */}
          <div className='md:hidden space-y-2'>
            {filteredAssessments.map((a) => {
              const pct = a.maxMarks > 0 ? Math.round((a.obtainedMarks / a.maxMarks) * 100) : 0;
              const catCfg = CATEGORY_CONFIG[a.category];
              const subColor = getSubjectColor(a.subjectId);
              const subName = getSubjectName(a.subjectId);
              return (
                <div key={a.id} className='metric-card group p-3'>
                  <div className='flex items-start justify-between mb-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      {subColor && (
                        <div className='status-dot' style={{ backgroundColor: subColor }} />
                      )}
                      <span className='text-xs text-muted-foreground truncate'>{subName}</span>
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
                  <p className='font-medium text-sm mb-2'>{a.name}</p>
                  <div className='flex items-center gap-2 mb-3'>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase ${catCfg.signalClass}`}>
                      {catCfg.label}
                    </span>
                    <span className='text-[11px] text-muted-foreground'>
                      {format(parseISO(a.date), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div className='flex items-end justify-between'>
                    <span className='text-lg font-bold'>{a.obtainedMarks} <span className='text-sm font-normal text-muted-foreground'>/ {a.maxMarks}</span></span>
                    <span className={`text-sm font-bold ${scoreColorClass(pct)}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Assessment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Assessment</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='assess-subject' className='section-label'>Subject</Label>
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
              <Label htmlFor='assess-name' className='section-label'>Name</Label>
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
                <Label htmlFor='assess-category' className='section-label'>Category</Label>
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
                <Label htmlFor='assess-date' className='section-label'>Date</Label>
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
                <Label htmlFor='assess-max' className='section-label'>Max Marks</Label>
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
                <Label htmlFor='assess-obtained' className='section-label'>Obtained Marks</Label>
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
              <Label htmlFor='assess-notes' className='section-label'>Notes</Label>
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
