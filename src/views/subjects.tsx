'use client';

import { useState, useMemo } from 'react';
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
  BarChart3,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import {
  getSubjectProgress,
  getSubjectAttendance,
  getSubjectMarks,
  getSubjectGrade,
  getSubjectSignal,
} from '@/lib/store';
import { SUBJECT_COLORS, SIGNAL_COLORS, GRADE_POINTS } from '@/lib/types';
import type { SignalStatus } from '@/lib/types';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

// -- Animation helpers ------------------------------------------------
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

// -- Grade options ----------------------------------------------------
const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

// -- Signal dot color helper -----------------------------------------
function signalDotColor(signal: SignalStatus): string {
  switch (signal) {
    case 'healthy': return 'bg-[var(--delulu-success)]';
    case 'improving': return 'bg-[var(--delulu-info)]';
    case 'attention': return 'bg-[var(--delulu-warning)]';
    case 'critical': return 'bg-[var(--delulu-danger)]';
    case 'upcoming': return 'bg-[var(--delulu-purple)]';
    default: return 'bg-muted-foreground';
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
}

const EMPTY_FORM: SubjectFormData = {
  name: '',
  code: '',
  credits: 3,
  color: SUBJECT_COLORS[0],
  targetGrade: 'A',
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

  const isEditing = !!editing;

  // Populate form when editing
  const handleOpen = (isOpen: boolean) => {
    if (isOpen && editing) {
      setForm({
        name: editing.name,
        code: editing.code,
        credits: editing.credits,
        color: editing.color,
        targetGrade: editing.targetGrade || 'A',
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
      });
    } else {
      const subjectId = crypto.randomUUID();
      addSubject({
        id: subjectId,
        name: form.name.trim(),
        code: form.code.trim(),
        credits: form.credits,
        color: form.color,
        archived: false,
        targetGrade: form.targetGrade,
      });

      // Create 5 empty syllabus units
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
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="sub-name">Name *</Label>
            <Input
              id="sub-name"
              placeholder="e.g. Data Structures"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <p className="text-xs text-[var(--delulu-danger)]">{errors.name}</p>}
          </div>

          {/* Code + Credits row */}
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
              {errors.credits && <p className="text-xs text-[var(--delulu-danger)]">{errors.credits}</p>}
            </div>
          </div>

          {/* Color swatches */}
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

          {/* Target Grade */}
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              Subjects
              <Badge variant="secondary" className="text-xs font-normal">
                {activeSubjects.length}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your semester subjects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Subject Grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {search ? 'No subjects match your search' : 'No subjects yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {search
              ? 'Try a different search term'
              : 'Add your first subject to get started tracking your academic progress.'}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
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
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer relative overflow-hidden group"
                >
                  {/* Color indicator bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: subject.color }}
                  />

                  {/* Top row: name + actions */}
                  <div className="flex items-start justify-between ml-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {subject.code}
                        {subject.code ? ' \u00b7 ' : ''}
                        {subject.credits} Credit{subject.credits !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {/* Health signal dot */}
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${signalDotColor(signal)}`}
                        title={signal}
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
                            className="text-[var(--delulu-danger)] focus:text-[var(--delulu-danger)]"
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
                  <div className="grid grid-cols-3 gap-3 mt-4 ml-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" />
                        Attendance
                      </span>
                      <span
                        className={`text-sm font-medium mt-0.5 ${
                          att.total > 0
                            ? att.percentage >= profile.attendanceThreshold
                              ? 'text-[var(--delulu-success)]'
                              : 'text-[var(--delulu-danger)]'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {att.total > 0 ? `${att.percentage}%` : '--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Syllabus
                      </span>
                      <span className="text-sm font-medium mt-0.5">
                        {progress > 0 ? `${progress}%` : '--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        Grade
                      </span>
                      <span className="text-sm font-medium mt-0.5">
                        {marks.max > 0 ? grade : '--'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {progress > 0 && (
                    <div className="mt-3 ml-2">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

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
              className="bg-[var(--delulu-danger)] text-white hover:bg-[var(--delulu-danger)]/90"
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
