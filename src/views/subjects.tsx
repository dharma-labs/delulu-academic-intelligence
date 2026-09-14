'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import {
  getSubjectProgress,
  getSubjectAttendance,
  getSubjectMarks,
  getSubjectGrade,
  getSubjectSignal,
} from '@/lib/store';
import { SUBJECT_COLORS, GRADE_POINTS } from '@/lib/types';
import type { SignalStatus } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PageHeader,
  EmptyState,
  StatusBadge,
} from '@/components/shared';

import { GEDSEAdvisor } from '@/components/ge-dse-advisor';
import { IAESplitView } from '@/components/ia-ese-split';
import { useUPCAutoPopulate } from '@/lib/use-upc-autopopulate';
import { getAttendanceState } from '@/lib/attendance-helpers';
// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// -- Grade options ----------------------------------------------------
const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

// -- Signal dot color helper -----------------------------------------
function signalDotColor(signal: SignalStatus): string {
  switch (signal) {
    case 'healthy': return 'bg-emerald-500 dark:bg-emerald-400';
    case 'improving': return 'bg-blue-500 dark:bg-blue-400';
    case 'attention': return 'bg-amber-500 dark:bg-amber-400';
    case 'critical': return 'bg-red-500 dark:bg-red-400';
    case 'upcoming': return 'bg-purple-500 dark:bg-purple-400';
    default: return 'bg-muted-foreground';
  }
}

// -- Signal to status badge mapping -----------------------------------
function signalToStatus(signal: SignalStatus): 'healthy' | 'improving' | 'attention' | 'critical' | 'upcoming' | 'nodata' {
  if (signal === 'nodata') return 'nodata';
  return signal as 'healthy' | 'improving' | 'attention' | 'critical' | 'upcoming';
}

function signalLabel(signal: SignalStatus): string {
  switch (signal) {
    case 'healthy': return 'Healthy';
    case 'improving': return 'Improving';
    case 'attention': return 'Attention';
    case 'critical': return 'Critical';
    case 'upcoming': return 'Upcoming';
    default: return 'No Data';
  }
}

// ======================================================================
// Subject Form Dialog
// ======================================================================
interface SubjectFormData {
  name: string;
  code: string;
  credits: number;
  color: string;
  targetGrade: string;
  backlog: boolean;
}

const EMPTY_FORM: SubjectFormData = {
  name: '',
  code: '',
  credits: 3,
  color: SUBJECT_COLORS[0],
  targetGrade: 'A',
  backlog: false,
};

function SubjectFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: { id: string } & SubjectFormData | null;
}) {
  const addSubject = useStore((s) => s.addSubject);
  const addSyllabusUnit = useStore((s) => s.addSyllabusUnit);
  const updateSubject = useStore((s) => s.updateSubject);

  const [form, setForm] = useState<SubjectFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { lookup } = useUPCAutoPopulate();
  const [upcSuggestion, setUpcSuggestion] = useState<{upcCode: string; credits: number; courseType: string; name: string; verified: boolean} | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);


  const isEditing = !!editing;
  // Watch subject name for UPC auto-populate suggestion
  useEffect(() => {
    if (!form.name || form.name.length < 3 || isEditing || suggestionDismissed) {
      setUpcSuggestion(null);
      return;
    }
    const result = lookup(form.name);
    if (result && result.upcCode) {
      setUpcSuggestion({
        upcCode: result.upcCode,
        credits: result.credits || 0,
        courseType: (result as any).courseType || 'DSC',
        name: form.name,
        verified: (result as any).verified !== false,
      });
    } else {
      setUpcSuggestion(null);
    }
  }, [form.name, isEditing, suggestionDismissed, lookup]);


  const handleOpen = (isOpen: boolean) => {
    if (isOpen && editing) {
      setForm({
        name: editing.name,
        code: editing.code,
        credits: editing.credits,
        color: editing.color,
        targetGrade: editing.targetGrade || 'A',
        backlog: editing.backlog || false,
      });
    } else if (isOpen) {
      setForm({ ...EMPTY_FORM, color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)] });
    }
    setErrors({});
    onOpenChange(isOpen);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Subject name is required';
    if (form.credits < 1) errs.credits = 'Credits must be at least 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing && editing) {
      updateSubject(editing.id, {
        name: form.name.trim(),
        code: form.code.trim(),
        credits: form.credits,
        color: form.color,
        targetGrade: form.targetGrade,
      backlog: form.backlog,
      });
    } else {
      const subjectId = crypto.randomUUID();
      addSubject({
        name: form.name.trim(),
        code: form.code.trim(),
        credits: form.credits,
        color: form.color,
        archived: false,
        targetGrade: form.targetGrade,
      semester: 1,
      courseType: 'DSC' as const,
      internalMarksMax: 25,
      endSemMarksMax: 75,
      backlog: form.backlog,
      });

      for (let i = 1; i <= 5; i++) {
        addSyllabusUnit({
          subjectId,
          name: `Unit ${i}`,
          order: i,
        });
      }
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the subject details below.'
              : 'Add a new subject to your semester. 5 empty units will be created automatically.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="sub-name">Name *</Label>
            <Input
              id="sub-name"
              placeholder="e.g. Data Structures"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        {/* UPC Auto-Populate Suggestion */}
        {upcSuggestion && !suggestionDismissed && (
          <div className="flex items-start gap-2 p-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded text-xs">
            <span className="text-blue-600 dark:text-blue-400 flex-1">
              Looks like UPC {upcSuggestion.upcCode} — {upcSuggestion.name} ({upcSuggestion.credits} cr, {upcSuggestion.courseType}).
              {!upcSuggestion.verified && ' ⚠ Some fields unconfirmed — check your syllabus.'}
              Use these details?
            </span>
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline shrink-0"
              onClick={() => {
                setForm(f => ({
                  ...f,
                  credits: upcSuggestion.credits || f.credits,
                  code: upcSuggestion.upcCode || f.code,
                }));
                setUpcSuggestion(null);
              }}
            >Accept</button>
            <button
              type="button"
              className="text-muted-foreground hover:underline shrink-0"
              onClick={() => setSuggestionDismissed(true)}
            >Dismiss</button>
          </div>
        )}

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sub-code">Code</Label>
              <Input
                id="sub-code"
                placeholder="e.g. CS201"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-credits">Credits *</Label>
              <Input
                id="sub-credits"
                type="number"
                min={1}
                max={10}
                value={form.credits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: Math.max(1, parseInt(e.target.value) || 1) }))
                }
              />
              {errors.credits && <p className="text-xs text-destructive">{errors.credits}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 w-7 rounded-full transition-all ${
                    form.color === c
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Target Grade</Label>
            <Select
              value={form.targetGrade}
              onValueChange={(v) => setForm((f) => ({ ...f, targetGrade: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}{' '}
                    <span className="text-muted-foreground text-xs">
                      ({GRADE_POINTS[g]} pts)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Save Changes' : 'Add Subject'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======================================================================
// Main Subjects View
// ======================================================================
export default function SubjectsView() {
  const subjects = useStore((s) => s.subjects);
  const syllabusUnits = useStore((s) => s.syllabusUnits);
  const assessments = useStore((s) => s.assessments);
  const attendance = useStore((s) => s.attendance);
  const profile = useStore((s) => s.profile);
  const navigate = useStore((s) => s.navigate);
  const selectSubject = useStore((s) => s.selectSubject);
  const deleteSubject = useStore((s) => s.deleteSubject);

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<
    { id: string } & SubjectFormData | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedIaEse, setExpandedIaEse] = useState<string | null>(null);

  const activeSubjects = useMemo(
    () => subjects.filter((s) => !s.archived),
    [subjects]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return activeSubjects;
    const q = search.toLowerCase();
    return activeSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [activeSubjects, search]);

  const handleCardClick = (id: string) => {
    selectSubject(id);
    navigate('subject-detail');
  };

  const handleEdit = (e: React.MouseEvent, subject: typeof activeSubjects[0]) => {
    e.stopPropagation();
    setEditingSubject({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      color: subject.color,
      targetGrade: subject.targetGrade || 'A',
      backlog: subject.backlog || false,
    });
    setDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteSubject(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingSubject(null);
  };

  return (
    <div className="content-area px-4 md:px-6 py-6">
      {/* Header */}
      <PageHeader
        title="Subjects"
        subtitle="Manage your semester subjects"
        badge={
          <Badge variant="secondary" className="text-xs font-normal tabular-nums">
            {activeSubjects.length}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-56 h-9"
              />
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Add Subject</span>
            </Button>
          </div>
        }
      />

      {/* Subject Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? 'No subjects match your search' : 'No subjects yet'}
          description={
            search
              ? 'Try a different search term'
              : 'Add your first subject to start tracking your academic progress.'
          }
          action={
            !search ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Subject
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filtered.map((subject) => {
              const progress = getSubjectProgress({ syllabusUnits }, subject.id);
              const att = getSubjectAttendance({ attendance }, subject.id);
              const marks = getSubjectMarks({ assessments }, subject.id);
              const grade = getSubjectGrade({ assessments }, subject.id);
              const signal = getSubjectSignal(
                {
                  attendance,
                  assessments,
                  syllabusUnits,
                  revisionItems: [],
                  profile,
                  subjects,
                } as any,
                subject.id
              );

              return (
                <motion.div
                  key={subject.id}
                  variants={fadeUp}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleCardClick(subject.id)}
                  className="card-interactive p-4 relative overflow-hidden group"
                >
                  {/* Color indicator bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ backgroundColor: subject.color }}
                  />

                  {/* Top row: name + signal + actions */}
                  <div className="flex items-start justify-between ml-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm leading-snug truncate">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        {subject.code}
                        {subject.code ? ' · ' : ''}
                        {subject.credits} Credit{subject.credits !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {/* Signal status badge */}
                      <StatusBadge
                        status={signalToStatus(signal)}
                        label={signalLabel(signal)}
                      />

                      {/* Dropdown actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleEdit(e, subject)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => handleDelete(e, subject.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 ml-2">
                    <div className="flex flex-col">
                      <span className="metric-label flex items-center gap-1 mb-1">
                        <ClipboardCheck className="size-3" />
                        Attendance
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          att.total > 0
                            ? getAttendanceState(att.percentage).colorClass
                            : 'text-muted-foreground'
                        }`}
                      >
                        {att.total > 0 ? `${att.percentage}%` : '--'}
                        {att.total > 0 && (
                          <span className="text-[10px] font-normal ml-1 opacity-70">{getAttendanceState(att.percentage).label}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="metric-label flex items-center gap-1 mb-1">
                        <BookOpen className="size-3" />
                        Syllabus
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {progress > 0 ? `${progress}%` : '--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="metric-label flex items-center gap-1 mb-1">
                        <GraduationCap className="size-3" />
                        Grade
                      </span>
                      <span className="text-sm font-semibold">
                        {marks.max > 0 ? grade : '--'}
                      </span>
                    </div>
                  </div>

                  {/* Thin progress bar */}
                  {progress > 0 && (
                    <div className="mt-3 ml-2">
                      <div className="progress-thin">
                        <div
                          className={
                            progress >= 75
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : progress >= 40
                                ? 'bg-blue-500 dark:bg-blue-400'
                                : 'bg-amber-500 dark:bg-amber-400'
                          }
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* IA/ESE Breakdown toggle */}
                  {subject.internalMarksMax > 0 && subject.endSemMarksMax > 0 && (
                    <div className="mt-3 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedIaEse(expandedIaEse === subject.id ? null : subject.id);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="size-3" />
                        <span>{expandedIaEse === subject.id ? 'Hide' : 'IA/ESE Breakdown'}</span>
                      </button>
                      <AnimatePresence>
                        {expandedIaEse === subject.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IAESplitView subject={subject} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Signal dot in top-right corner area */}
                  <div className="absolute top-4 right-2 flex items-center gap-1.5">
                    <span
                      className={`status-dot ${signalDotColor(signal)}`}
                      title={signal}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      
      {/* Carryover Papers - dignity-preserving label, same visual weight */}
      {(() => {
        const carryover = subjects.filter(s => s.backlog && !s.archived);
        if (carryover.length === 0) return null;
        return (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Carryover Papers ({carryover.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {carryover.map((subject) => {
                const marks = getSubjectMarks({ assessments }, subject.id);
                const grade = getSubjectGrade({ assessments }, subject.id);
                return (
                  <div key={subject.id} className="card-interactive p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-medium">{subject.name}</h4>
                        {subject.code && <p className="text-xs text-muted-foreground">{subject.code}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                        {subject.credits} cr
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {marks.max > 0 && <span>{marks.obtained}/{marks.max} marks</span>}
                      {marks.max > 0 && <span>Grade: {grade}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <GEDSEAdvisor />

      {/* Add/Edit Dialog */}
      <SubjectFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editing={editingSubject}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subject? This will also remove all
              associated syllabus units, assessments, attendance records, and notes.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
