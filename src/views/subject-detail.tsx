'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, isToday, parseISO, compareDesc } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  CalendarDays,
  FileText,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Brain,
  Timer,
  Flame,
  Save,
  Undo2,
  RotateCcw,
  Eye,
  Trash,
  Edit3,
} from 'lucide-react';

import { useStore } from '@/lib/store';
import {
  getSubjectProgress,
  getSubjectAttendance,
  getSubjectMarks,
  getSubjectGrade,
  getSubjectSignal,
  reviewRevisionItem,
} from '@/lib/store';
import { SUBJECT_COLORS, SIGNAL_COLORS, GRADE_POINTS, GRADE_FROM_PERCENTAGE } from '@/lib/types';
import type { SignalStatus, Assessment, Exam, RevisionItem, Note, SyllabusUnit, SyllabusTopic } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// -- Helpers ------------------------------------------------------------

const GRADE_OPTIONS = Object.keys(GRADE_POINTS);
const ASSESSMENT_CATEGORIES: { value: Assessment['category']; label: string }[] = [
  { value: 'ca_test', label: 'CA Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'practical', label: 'Practical' },
  { value: 'other', label: 'Other' },
];

const EXAM_TYPES: { value: Exam['type']; label: string }[] = [
  { value: 'midsem', label: 'Mid-Semester' },
  { value: 'endsem', label: 'End-Semester' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'practical', label: 'Practical' },
  { value: 'other', label: 'Other' },
];

function signalBadge(signal: SignalStatus) {
  const map: Record<SignalStatus, { label: string; className: string }> = {
    healthy: { label: 'Healthy', className: 'bg-[var(--delulu-success)]/15 text-[var(--delulu-success)] border-[var(--delulu-success)]/20' },
    improving: { label: 'Improving', className: 'bg-[var(--delulu-info)]/15 text-[var(--delulu-info)] border-[var(--delulu-info)]/20' },
    attention: { label: 'Needs Attention', className: 'bg-[var(--delulu-warning)]/15 text-[var(--delulu-warning)] border-[var(--delulu-warning)]/20' },
    critical: { label: 'Critical', className: 'bg-[var(--delulu-danger)]/15 text-[var(--delulu-danger)] border-[var(--delulu-danger)]/20' },
    upcoming: { label: 'Upcoming', className: 'bg-[var(--delulu-purple)]/15 text-[var(--delulu-purple)] border-[var(--delulu-purple)]/20' },
    nodata: { label: 'No Data', className: 'bg-muted text-muted-foreground border-border' },
  };
  const s = map[signal];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function pctColor(pct: number): string {
  if (pct >= 75) return 'text-[var(--delulu-success)]';
  if (pct >= 50) return 'text-[var(--delulu-info)]';
  if (pct >= 30) return 'text-[var(--delulu-warning)]';
  return 'text-[var(--delulu-danger)]';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// ======================================================================
// Overview Tab
// ======================================================================
function OverviewTab({ subjectId }: { subjectId: string }) {
  const subject = useStore((s) => s.subjects.find((x) => x.id === subjectId));
  const syllabusUnits = useStore((s) => s.syllabusUnits.filter((u) => u.subjectId === subjectId));
  const assessments = useStore((s) => s.assessments.filter((a) => a.subjectId === subjectId));
  const attendance = useStore((s) => s.attendance.filter((a) => a.subjectId === subjectId));
  const studySessions = useStore((s) => s.studySessions.filter((s) => s.subjectId === subjectId));
  const exams = useStore((s) => s.exams.filter((e) => e.subjectId === subjectId));
  const profile = useStore((s) => s.profile);

  const progress = getSubjectProgress({ syllabusUnits }, subjectId);
  const att = getSubjectAttendance({ attendance }, subjectId);
  const marks = getSubjectMarks({ assessments }, subjectId);
  const grade = getSubjectGrade({ assessments }, subjectId);

  // CA performance (average assessment %)
  const caPct = assessments.length > 0
    ? Math.round(assessments.reduce((sum, a) => sum + (a.maxMarks > 0 ? (a.obtainedMarks / a.maxMarks) * 100 : 0), 0) / assessments.length)
    : 0;

  // Next upcoming exam
  const nextExam = exams
    .filter((e) => e.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  // Recommended action
  const recommendation = useMemo(() => {
    const recs: string[] = [];
    if (att.total > 0 && att.percentage < profile.attendanceThreshold) {
      recs.push(`Attendance is below ${profile.attendanceThreshold}% threshold. Focus on attending classes.`);
    }
    if (progress < 50 && progress > 0) {
      recs.push('Syllabus is less than halfway done. Prioritize completing more topics.');
    }
    if (progress === 0) {
      recs.push('No syllabus progress yet. Start by adding topics to your units.');
    }
    if (marks.percentage < 50 && marks.max > 0) {
      recs.push('Assessment scores need improvement. Review weak areas before the next test.');
    }
    if (nextExam) {
      const daysUntil = Math.ceil((parseISO(nextExam.date).getTime() - Date.now()) / 86400000);
      if (daysUntil <= 7) {
        recs.push(`${nextExam.name} is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Intensive revision recommended.`);
      }
    }
    if (recs.length === 0) {
      if (progress >= 80 && marks.percentage >= 70) {
        recs.push('Great progress! Keep up the consistency and start revising for exams.');
      } else {
        recs.push('Add more data (attendance, marks, study sessions) to get personalized recommendations.');
      }
    }
    return recs[0];
  }, [att, progress, marks, nextExam, profile.attendanceThreshold]);

  // Recent activity (last 5 items combined from sessions and assessments)
  const recentActivity = useMemo(() => {
    const items: { type: string; label: string; date: string }[] = [];
    studySessions.forEach((s) =>
      items.push({ type: 'session', label: `Studied for ${formatDuration(s.duration)}`, date: s.date })
    );
    assessments.forEach((a) =>
      items.push({ type: 'assessment', label: `${a.name}: ${a.obtainedMarks}/${a.maxMarks}`, date: a.date })
    );
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [studySessions, assessments]);

  if (!subject) return null;

  const metrics = [
    {
      label: 'Current Grade',
      value: marks.max > 0 ? grade : '--',
      sub: marks.max > 0 ? `${marks.percentage}% average` : 'No assessments yet',
      icon: GraduationCap,
      color: marks.max > 0 ? pctColor(marks.percentage) : 'text-muted-foreground',
    },
    {
      label: 'Attendance',
      value: att.total > 0 ? `${att.percentage}%` : '--',
      sub: att.total > 0 ? `${att.present}/${att.total} classes` : 'No records yet',
      icon: ClipboardCheck,
      color: att.total > 0
        ? att.percentage >= profile.attendanceThreshold
          ? 'text-[var(--delulu-success)]'
          : 'text-[var(--delulu-danger)]'
        : 'text-muted-foreground',
    },
    {
      label: 'Syllabus',
      value: `${progress}%`,
      sub: progress > 0 ? 'topics completed' : 'No topics yet',
      icon: BookOpen,
      color: progress >= 75 ? 'text-[var(--delulu-success)]' : progress >= 40 ? 'text-[var(--delulu-info)]' : 'text-muted-foreground',
    },
    {
      label: 'CA Performance',
      value: caPct > 0 ? `${caPct}%` : '--',
      sub: caPct > 0 ? `across ${assessments.length} assessment${assessments.length !== 1 ? 's' : ''}` : 'No assessments yet',
      icon: BarChart3,
      color: caPct > 0 ? pctColor(caPct) : 'text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <motion.div key={m.label} variants={fadeUp} initial="hidden" animate="show">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
              </div>
              <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Next Assessment + Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Next Assessment</span>
            </div>
            {nextExam ? (
              <div>
                <p className="font-medium">{nextExam.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(parseISO(nextExam.date), 'dd MMM yyyy')}
                </p>
                <Badge variant="outline" className="mt-2 capitalize">{nextExam.type}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming assessments</p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recommended Action</span>
            </div>
            <p className="text-sm leading-relaxed">{recommendation}</p>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {item.type === 'session' ? (
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity recorded</p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

// ======================================================================
// Syllabus Tab
// ======================================================================
function SyllabusTab({ subjectId }: { subjectId: string }) {
  const units = useStore((s) => s.syllabusUnits.filter((u) => u.subjectId === subjectId).sort((a, b) => a.order - b.order));
  const addSyllabusUnit = useStore((s) => s.addSyllabusUnit);
  const updateSyllabusUnit = useStore((s) => s.updateSyllabusUnit);
  const deleteSyllabusUnit = useStore((s) => s.deleteSyllabusUnit);
  const addSyllabusTopic = useStore((s) => s.addSyllabusTopic);
  const updateSyllabusTopic = useStore((s) => s.updateSyllabusTopic);
  const deleteSyllabusTopic = useStore((s) => s.deleteSyllabusTopic);
  const toggleTopicComplete = useStore((s) => s.toggleTopicComplete);

  const [newTopicMap, setNewTopicMap] = useState<Record<string, string>>({});
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const totalTopics = units.reduce((sum, u) => sum + u.topics.length, 0);
  const completedTopics = units.reduce((sum, u) => sum + u.topics.filter((t) => t.completed).length, 0);
  const overallPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const handleAddTopic = (unitId: string) => {
    const name = newTopicMap[unitId]?.trim();
    if (!name) return;
    const unit = units.find((u) => u.id === unitId);
    addSyllabusTopic({
      unitId,
      subjectId,
      name,
      completed: false,
      order: unit ? unit.topics.length + 1 : 1,
    });
    setNewTopicMap((prev) => ({ ...prev, [unitId]: '' }));
  };

  const handleAddUnit = () => {
    const name = newUnitName.trim();
    if (!name) return;
    addSyllabusUnit({
      subjectId,
      name,
      order: units.length + 1,
    });
    setNewUnitName('');
    setShowAddUnit(false);
  };

  const startEditUnit = (unit: SyllabusUnit) => {
    setEditingUnitId(unit.id);
    setEditValue(unit.name);
  };

  const saveEditUnit = () => {
    if (editingUnitId && editValue.trim()) {
      updateSyllabusUnit(editingUnitId, { name: editValue.trim() });
    }
    setEditingUnitId(null);
    setEditValue('');
  };

  const startEditTopic = (topic: SyllabusTopic) => {
    setEditingTopicId(topic.id);
    setEditValue(topic.name);
  };

  const saveEditTopic = () => {
    if (editingTopicId && editValue.trim()) {
      updateSyllabusTopic(editingTopicId, { name: editValue.trim() });
    }
    setEditingTopicId(null);
    setEditValue('');
  };

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-semibold">{completedTopics}/{totalTopics} topics ({overallPct}%)</span>
        </div>
        <Progress value={overallPct} className="h-2" />
      </Card>

      {/* Units */}
      {units.length === 0 && !showAddUnit ? (
        <div className="text-center py-12">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium mb-1">No syllabus units yet</h3>
          <p className="text-xs text-muted-foreground mb-4">Add units to start tracking your syllabus progress</p>
          <Button size="sm" onClick={() => setShowAddUnit(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Unit
          </Button>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {units.map((unit) => {
            const completed = unit.topics.filter((t) => t.completed).length;
            const total = unit.topics.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <AccordionItem key={unit.id} value={unit.id} className="border rounded-lg px-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 rounded-t-lg">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    {/* Inline edit unit name */}
                    {editingUnitId === unit.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditUnit();
                            if (e.key === 'Escape') setEditingUnitId(null);
                          }}
                          className="h-8 text-sm"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); saveEditUnit(); }}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm flex-1" onDoubleClick={(e) => { e.stopPropagation(); startEditUnit(unit); }}>{unit.name}</span>
                        <span className="text-xs text-muted-foreground">{completed}/{total}</span>
                        <div className="w-20">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-1">
                    {unit.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 group py-1.5 px-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={topic.completed}
                          onCheckedChange={() => toggleTopicComplete(topic.id)}
                          className="shrink-0"
                        />

                        {editingTopicId === topic.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditTopic();
                                if (e.key === 'Escape') setEditingTopicId(null);
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditTopic}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingTopicId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`text-sm flex-1 ${topic.completed ? 'line-through text-muted-foreground' : ''}`}
                              onDoubleClick={() => startEditTopic(topic)}
                            >
                              {topic.name}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteSyllabusTopic(topic.id)}
                            >
                              <Trash className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add topic input */}
                    <div className="flex items-center gap-2 mt-2 pl-7">
                      <Input
                        placeholder="Add topic..."
                        value={newTopicMap[unit.id] || ''}
                        onChange={(e) =>
                          setNewTopicMap((prev) => ({ ...prev, [unit.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic(unit.id)}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleAddTopic(unit.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Delete unit */}
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground h-7"
                        onClick={() => deleteSyllabusUnit(unit.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete unit
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Add unit */}
      {showAddUnit ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Unit name..."
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddUnit();
                if (e.key === 'Escape') setShowAddUnit(false);
              }}
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleAddUnit} disabled={!newUnitName.trim()}>
              <Check className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddUnit(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : units.length > 0 ? (
        <Button variant="outline" size="sm" onClick={() => setShowAddUnit(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Unit
        </Button>
      ) : null}
    </div>
  );
}

// ======================================================================
// Marks Tab
// ======================================================================
function MarksTab({ subjectId }: { subjectId: string }) {
  const assessments = useStore((s) => s.assessments.filter((a) => a.subjectId === subjectId));
  const subject = useStore((s) => s.subjects.find((x) => x.id === subjectId));
  const addAssessment = useStore((s) => s.addAssessment);
  const updateAssessment = useStore((s) => s.updateAssessment);
  const deleteAssessment = useStore((s) => s.deleteAssessment);
  const updateSubject = useStore((s) => s.updateSubject);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: 'ca_test' as Assessment['category'],
    maxMarks: 100,
    obtainedMarks: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const marks = getSubjectMarks({ assessments }, subjectId);
  const grade = getSubjectGrade({ assessments }, subjectId);

  // Target simulator
  const targetGrade = subject?.targetGrade || 'A';
  const targetPct = GRADE_POINTS[targetGrade]
    ? (() => {
        // Reverse lookup approximate percentage for grade
        const thresholds: [number, string][] = [
          [90, 'O'], [80, 'A'], [70, 'A-'], [60, 'B+'], [55, 'B'], [50, 'B-'], [45, 'C'], [40, 'P'],
        ];
        const entry = thresholds.find(([, g]) => g === targetGrade);
        return entry ? entry[0] : 80;
      })()
    : 80;

  const caAssessments = assessments.filter((a) => a.category !== 'other');
  const caTotal = caAssessments.reduce((s, a) => s + a.maxMarks, 0);
  const caObtained = caAssessments.reduce((s, a) => s + a.obtainedMarks, 0);
  const caWeight = caTotal > 0 ? caTotal / 100 * 40 : 0; // Assume CA is 40%
  const endSemWeight = 60; // Assume end-sem is 60%
  const endSemTotal = 100;
  const requiredEndSemPct = caTotal > 0
    ? Math.max(0, ((targetPct - (caObtained / Math.max(1, caTotal)) * 40) / 60) * 100)
    : targetPct;
  const isReachable = requiredEndSemPct <= 100;

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addAssessment({
      subjectId,
      name: form.name.trim(),
      category: form.category,
      maxMarks: form.maxMarks,
      obtainedMarks: form.obtainedMarks,
      date: form.date,
      notes: form.notes,
    });
    setForm({ name: '', category: 'ca_test', maxMarks: 100, obtainedMarks: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setShowAdd(false);
  };

  const startEditMarks = (a: Assessment) => {
    setEditingId(a.id);
    setEditMarks(String(a.obtainedMarks));
  };

  const saveEditMarks = () => {
    if (editingId) {
      updateAssessment(editingId, { obtainedMarks: parseFloat(editMarks) || 0 });
    }
    setEditingId(null);
  };

  const categoryLabel = (c: Assessment['category']) =>
    ASSESSMENT_CATEGORIES.find((x) => x.value === c)?.label || c;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Total Marks</span>
          <p className="text-xl font-semibold mt-1">{marks.obtained}/{marks.max}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Percentage</span>
          <p className={`text-xl font-semibold mt-1 ${pctColor(marks.percentage)}`}>{marks.percentage}%</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Current Grade</span>
          <p className={`text-xl font-semibold mt-1 ${pctColor(marks.percentage)}`}>{marks.max > 0 ? grade : '--'}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Target Grade</span>
          <Select value={targetGrade} onValueChange={(v) => subject && updateSubject(subjectId, { targetGrade: v })}>
            <SelectTrigger className="h-8 mt-1 text-base font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* Target Simulator */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Target Simulator</span>
        </div>
        {marks.max > 0 ? (
          isReachable ? (
            <p className="text-sm">
              You need <span className={`font-semibold ${pctColor(requiredEndSemPct)}`}>{Math.ceil(requiredEndSemPct)}%</span> in the end-semester exam to reach your target grade of <span className="font-semibold">{targetGrade}</span>.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--delulu-danger)]" />
              <p className="text-sm text-[var(--delulu-danger)] font-medium">
                Target grade {targetGrade} may be unreachable with current CA scores.
              </p>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Add assessments to see your target simulation.</p>
        )}
      </Card>

      {/* Assessment List */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Assessments ({assessments.length})</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Assessment
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No assessments recorded yet</p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Obtained</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.sort((a, b) => b.date.localeCompare(a.date)).map((a) => {
                    const pct = a.maxMarks > 0 ? Math.round((a.obtainedMarks / a.maxMarks) * 100) : 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {editingId === a.id ? (
                            <Input
                              value={editMarks}
                              onChange={(e) => setEditMarks(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEditMarks(); if (e.key === 'Escape') setEditingId(null); }}
                              className="h-7 w-20"
                              autoFocus
                              type="number"
                            />
                          ) : (
                            <span className="cursor-pointer hover:underline" onClick={() => startEditMarks(a)}>{a.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{categoryLabel(a.category)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {editingId === a.id ? (
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={saveEditMarks}>
                              <Save className="h-3 w-3 mr-1" /> Save
                            </Button>
                          ) : (
                            <span>{a.obtainedMarks}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{a.maxMarks}</TableCell>
                        <TableCell className={`text-right font-mono font-medium ${pctColor(pct)}`}>{pct}%</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">{a.date}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditMarks(a)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit marks
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-[var(--delulu-danger)] focus:text-[var(--delulu-danger)]" onClick={() => deleteAssessment(a.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            {assessments.sort((a, b) => b.date.localeCompare(a.date)).map((a) => {
              const pct = a.maxMarks > 0 ? Math.round((a.obtainedMarks / a.maxMarks) * 100) : 0;
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <Badge variant="outline" className="text-xs capitalize mt-1">{categoryLabel(a.category)}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {editingId === a.id ? (
                        <>
                          <Input value={editMarks} onChange={(e) => setEditMarks(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditMarks(); }} className="h-7 w-16 text-sm" autoFocus type="number" />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditMarks}><Check className="h-3 w-3" /></Button>
                        </>
                      ) : (
                        <span className={`text-lg font-semibold ${pctColor(pct)}`}>{pct}%</span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditMarks(a)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-[var(--delulu-danger)] focus:text-[var(--delulu-danger)]" onClick={() => deleteAssessment(a.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{a.obtainedMarks}/{a.maxMarks}</span>
                    <span>{a.date}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add Assessment Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Assessment</DialogTitle>
            <DialogDescription>Record a new assessment for this subject.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="assess-name">Name *</Label>
              <Input id="assess-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mid-Semester Test 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Assessment['category'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assess-date">Date</Label>
                <Input id="assess-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assess-max">Max Marks</Label>
                <Input id="assess-max" type="number" min={1} value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: Math.max(1, parseInt(e.target.value) || 1) }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assess-obt">Obtained Marks</Label>
                <Input id="assess-obt" type="number" min={0} value={form.obtainedMarks} onChange={(e) => setForm((f) => ({ ...f, obtainedMarks: Math.max(0, parseFloat(e.target.value) || 0) }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assess-notes">Notes</Label>
              <Textarea id="assess-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim()}>Add Assessment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ======================================================================
// Attendance Tab
// ======================================================================
function AttendanceTab({ subjectId }: { subjectId: string }) {
  const records = useStore((s) => s.attendance.filter((a) => a.subjectId === subjectId));
  const profile = useStore((s) => s.profile);
  const addAttendance = useStore((s) => s.addAttendance);
  const deleteAttendance = useStore((s) => s.deleteAttendance);

  const att = getSubjectAttendance({ attendance: records }, subjectId);
  const today = new Date().toISOString().split('T')[0];

  const todayRecord = records.find((r) => r.date === today);

  const status = att.total === 0
    ? 'NO DATA'
    : att.percentage >= profile.attendanceThreshold
      ? 'SAFE'
      : att.percentage >= profile.attendanceThreshold - 10
        ? 'WATCH'
        : 'RISK';

  const statusColor =
    status === 'SAFE' ? 'text-[var(--delulu-success)]' :
    status === 'WATCH' ? 'text-[var(--delulu-warning)]' :
    status === 'RISK' ? 'text-[var(--delulu-danger)]' :
    'text-muted-foreground';

  // How many more classes can be missed
  const canMiss = useMemo(() => {
    if (att.total === 0) return 'N/A';
    const threshold = profile.attendanceThreshold;
    // (present) / (total + x) >= threshold/100
    // x <= (present * 100 / threshold) - total
    const maxMissable = Math.floor((att.present * 100) / threshold) - att.total;
    return Math.max(0, maxMissable);
  }, [att, profile.attendanceThreshold]);

  const handleQuickMark = (present: boolean) => {
    if (todayRecord) return; // already marked today
    addAttendance({
      subjectId,
      date: today,
      present,
      totalClasses: 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Present</span>
          <p className="text-xl font-semibold mt-1 text-[var(--delulu-success)]">{att.present}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Absent</span>
          <p className="text-xl font-semibold mt-1 text-[var(--delulu-danger)]">{att.total - att.present}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Total</span>
          <p className="text-xl font-semibold mt-1">{att.total}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Percentage</span>
          <p className={`text-xl font-semibold mt-1 ${statusColor}`}>{att.percentage}%</p>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <span className="text-xs text-muted-foreground font-medium">Status</span>
          <p className={`text-lg font-semibold mt-1 ${statusColor}`}>{status}</p>
        </Card>
      </div>

      {/* Can miss info */}
      <Card className="p-4">
        <p className="text-sm">
          {typeof canMiss === 'number' ? (
            canMiss > 0 ? (
              <>
                You can miss <span className="font-semibold text-[var(--delulu-success)]">{canMiss} more class{canMiss !== 1 ? 'es' : ''}</span> before falling below the {profile.attendanceThreshold}% threshold.
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 inline text-[var(--delulu-danger)] mr-1" />
                You cannot miss any more classes. Your attendance is already at or below the threshold.
              </>
            )
          ) : (
            'Mark your first attendance to see predictions.'
          )}
        </p>
      </Card>

      {/* Quick mark */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Mark Today's Attendance</h3>
        {todayRecord ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${todayRecord.present ? 'text-[var(--delulu-success)]' : 'text-[var(--delulu-danger)]'}`} />
            <span className="text-sm">
              Marked as <span className="font-medium">{todayRecord.present ? 'Present' : 'Absent'}</span> today
            </span>
            <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => deleteAttendance(todayRecord.id)}>
              Undo
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-[var(--delulu-success)] hover:bg-[var(--delulu-success)]/90 text-white"
              onClick={() => handleQuickMark(true)}
            >
              <Check className="h-4 w-4 mr-2" /> Present
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-[var(--delulu-danger)]/30 text-[var(--delulu-danger)] hover:bg-[var(--delulu-danger)]/10"
              onClick={() => handleQuickMark(false)}
            >
              <X className="h-4 w-4 mr-2" /> Absent
            </Button>
          </div>
        )}
      </Card>

      {/* Attendance History */}
      <div>
        <h3 className="text-sm font-medium mb-3">Attendance History</h3>
        {records.length === 0 ? (
          <Card className="p-8 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attendance records yet</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {records
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${r.present ? 'bg-[var(--delulu-success)]/10' : 'bg-[var(--delulu-danger)]/10'}`}>
                      {r.present ? (
                        <Check className="h-4 w-4 text-[var(--delulu-success)]" />
                      ) : (
                        <X className="h-4 w-4 text-[var(--delulu-danger)]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.present ? 'Present' : 'Absent'}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteAttendance(r.id)}>
                    <Trash className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================================
// Revision Tab
// ======================================================================
function RevisionTab({ subjectId }: { subjectId: string }) {
  const items = useStore((s) => s.revisionItems.filter((r) => r.subjectId === subjectId));
  const store = useStore();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const dueItems = items.filter((r) => r.nextReview <= today);
  const upcomingItems = items.filter((r) => r.nextReview > today);

  const handleReview = (itemId: string, quality: number) => {
    reviewRevisionItem(store, itemId, quality);
    setReviewingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Due items */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-[var(--delulu-danger)]" />
          Due for Review ({dueItems.length})
        </h3>
        {dueItems.length === 0 ? (
          <Card className="p-6 text-center">
            <CheckCircle2 className="h-6 w-6 text-[var(--delulu-success)] mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No items due for review. You're on track!</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {dueItems.map((item) => (
              <Card key={item.id} className="p-4 border-l-4 border-l-[var(--delulu-danger)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.topicName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {item.nextReview}
                      {item.lastReview && ` · Last reviewed: ${item.lastReview}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">Rep: {item.repetitions}</Badge>
                      <Badge variant="outline" className="text-xs">Interval: {item.interval}d</Badge>
                    </div>
                  </div>
                  {reviewingId === item.id ? (
                    <div className="flex gap-1">
                      {[{ q: 1, label: 'Again', color: 'text-[var(--delulu-danger)]' }, { q: 3, label: 'Hard', color: 'text-[var(--delulu-warning)]' }, { q: 4, label: 'Good', color: 'text-[var(--delulu-info)]' }, { q: 5, label: 'Easy', color: 'text-[var(--delulu-success)]' }].map((btn) => (
                        <Button key={btn.label} size="sm" variant="outline" className={`h-7 text-xs ${btn.color}`} onClick={() => handleReview(item.id, btn.q)}>
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setReviewingId(item.id)}>
                      <Brain className="h-4 w-4 mr-1" /> Review
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming items */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Upcoming ({upcomingItems.length})
        </h3>
        {upcomingItems.length === 0 && dueItems.length === 0 ? (
          <Card className="p-6 text-center">
            <Brain className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No revision items for this subject. Add topics to your syllabus and create revision items from the Focus view.</p>
          </Card>
        ) : upcomingItems.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {upcomingItems.sort((a, b) => a.nextReview.localeCompare(b.nextReview)).map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.topicName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Next review: {item.nextReview}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">In {Math.ceil((parseISO(item.nextReview).getTime() - Date.now()) / 86400000)}d</Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ======================================================================
// Notes Tab
// ======================================================================
function NotesTab({ subjectId }: { subjectId: string }) {
  const notes = useStore((s) => s.notes.filter((n) => n.subjectId === subjectId));
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    addNote({ subjectId, title: form.title.trim(), content: form.content });
    setForm({ title: '', content: '' });
    setShowAdd(false);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditForm({ title: note.title, content: note.content });
  };

  const saveEdit = () => {
    if (editingId && editForm.title.trim()) {
      updateNote(editingId, {
        title: editForm.title.trim(),
        content: editForm.content,
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingId(null);
  };

  const sortedNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </div>

      {/* Add note form */}
      {showAdd && (
        <Card className="p-4 space-y-3">
          <Input
            placeholder="Note title..."
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="font-medium"
          />
          <Textarea
            placeholder="Write your note here..."
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!form.title.trim()}>Save Note</Button>
          </div>
        </Card>
      )}

      {/* Notes list */}
      {sortedNotes.length === 0 && !showAdd ? (
        <Card className="p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No notes yet for this subject</p>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
          {sortedNotes.map((note) => (
            <Card key={note.id} className="p-4">
              {editingId === note.id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="font-medium"
                  />
                  <Textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={saveEdit}>Save</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => startEdit(note)}>
                      <h4 className="font-medium text-sm">{note.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{note.content || 'No content'}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {format(parseISO(note.updatedAt), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 ml-2" onClick={() => deleteNote(note.id)}>
                      <Trash className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Exams Tab
// ======================================================================
function ExamsTab({ subjectId }: { subjectId: string }) {
  const exams = useStore((s) => s.exams.filter((e) => e.subjectId === subjectId));
  const addExam = useStore((s) => s.addExam);
  const updateExam = useStore((s) => s.updateExam);
  const deleteExam = useStore((s) => s.deleteExam);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: 'midsem' as Exam['type'],
    totalMarks: 100,
    status: 'upcoming' as Exam['status'],
    obtainedMarks: undefined as number | undefined,
    preparationNotes: '',
  });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addExam({
      subjectId,
      name: form.name.trim(),
      date: form.date,
      type: form.type,
      totalMarks: form.totalMarks,
      status: form.status,
      obtainedMarks: form.status === 'completed' ? form.obtainedMarks : undefined,
      preparationNotes: form.preparationNotes,
    });
    setForm({ name: '', date: new Date().toISOString().split('T')[0], type: 'midsem', totalMarks: 100, status: 'upcoming', obtainedMarks: undefined, preparationNotes: '' });
    setShowAdd(false);
  };

  const typeLabel = (t: Exam['type']) => EXAM_TYPES.find((x) => x.value === t)?.label || t;

  const sortedExams = [...exams].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Exam
        </Button>
      </div>

      {sortedExams.length === 0 ? (
        <Card className="p-8 text-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No exams scheduled yet</p>
        </Card>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {sortedExams.map((exam) => (
            <Card key={exam.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-sm">{exam.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs">{typeLabel(exam.type)}</Badge>
                    <Badge
                      variant={exam.status === 'completed' ? 'secondary' : 'outline'}
                      className={`text-xs ${exam.status === 'completed' ? 'bg-[var(--delulu-success)]/10 text-[var(--delulu-success)]' : ''}`}
                    >
                      {exam.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{exam.date}</span>
                  </div>
                  {exam.status === 'completed' && exam.obtainedMarks !== undefined && (
                    <p className={`text-sm mt-2 font-medium ${pctColor(exam.totalMarks > 0 ? Math.round((exam.obtainedMarks / exam.totalMarks) * 100) : 0)}`}>
                      {exam.obtainedMarks}/{exam.totalMarks}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Total: {exam.totalMarks} marks</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {exam.status === 'upcoming' && (
                      <DropdownMenuItem onClick={() => updateExam(exam.id, { status: 'completed', obtainedMarks: 0 })}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Mark completed
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-[var(--delulu-danger)] focus:text-[var(--delulu-danger)]" onClick={() => deleteExam(exam.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Exam Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exam</DialogTitle>
            <DialogDescription>Schedule a new exam for this subject.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="exam-name">Name *</Label>
              <Input id="exam-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. End Semester" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as Exam['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exam-date">Date</Label>
                <Input id="exam-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exam-total">Total Marks</Label>
                <Input id="exam-total" type="number" min={1} value={form.totalMarks} onChange={(e) => setForm((f) => ({ ...f, totalMarks: Math.max(1, parseInt(e.target.value) || 1) }))} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Exam['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.status === 'completed' && (
              <div className="grid gap-2">
                <Label htmlFor="exam-obt">Obtained Marks</Label>
                <Input id="exam-obt" type="number" min={0} value={form.obtainedMarks ?? ''} onChange={(e) => setForm((f) => ({ ...f, obtainedMarks: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ======================================================================
// Main Subject Detail View
// ======================================================================
export default function SubjectDetailView() {
  const selectedSubjectId = useStore((s) => s.selectedSubjectId);
  const subject = useStore((s) => s.subjects.find((x) => x.id === s.selectedSubjectId));
  const goBack = useStore((s) => s.goBack);
  const navigate = useStore((s) => s.navigate);
  const deleteSubject = useStore((s) => s.deleteSubject);
  const selectSubject = useStore((s) => s.selectSubject);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', code: '', credits: 3, color: '', targetGrade: 'A' });

  if (!subject || !selectedSubjectId) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={goBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-muted-foreground">No subject selected.</p>
      </div>
    );
  }

  const signal = getSubjectSignal(useStore.getState(), selectedSubjectId);

  const handleEditOpen = () => {
    setEditForm({
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      color: subject.color,
      targetGrade: subject.targetGrade || 'A',
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    const store = useStore.getState();
    store.updateSubject(selectedSubjectId, {
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      credits: editForm.credits,
      color: editForm.color,
      targetGrade: editForm.targetGrade,
    });
    setEditOpen(false);
  };

  const handleDelete = () => {
    deleteSubject(selectedSubjectId);
    selectSubject(null);
    setDeleteOpen(false);
    navigate('subjects');
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 mt-0.5" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{subject.name}</h1>
            {signalBadge(signal)}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {subject.code}{subject.code ? ' · ' : ''}{subject.credits} Credit{subject.credits !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditOpen}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Subject
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[var(--delulu-danger)] focus:text-[var(--delulu-danger)]" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Subject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-thin">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="syllabus" className="text-sm">Syllabus</TabsTrigger>
          <TabsTrigger value="marks" className="text-sm">Marks</TabsTrigger>
          <TabsTrigger value="attendance" className="text-sm">Attendance</TabsTrigger>
          <TabsTrigger value="revision" className="text-sm">Revision</TabsTrigger>
          <TabsTrigger value="notes" className="text-sm">Notes</TabsTrigger>
          <TabsTrigger value="exams" className="text-sm">Exams</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab subjectId={selectedSubjectId} />
        </TabsContent>
        <TabsContent value="syllabus">
          <SyllabusTab subjectId={selectedSubjectId} />
        </TabsContent>
        <TabsContent value="marks">
          <MarksTab subjectId={selectedSubjectId} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab subjectId={selectedSubjectId} />
        </TabsContent>
        <TabsContent value="revision">
          <RevisionTab subjectId={selectedSubjectId} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab subjectId={selectedSubjectId} />
        </TabsContent>
        <TabsContent value="exams">
          <ExamsTab subjectId={selectedSubjectId} />
        </TabsContent>
      </Tabs>

      {/* Edit Subject Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Update the subject details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Code</Label>
                <Input value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Credits</Label>
                <Input type="number" min={1} value={editForm.credits} onChange={(e) => setEditForm((f) => ({ ...f, credits: Math.max(1, parseInt(e.target.value) || 1) }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full transition-all ${editForm.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Target Grade</Label>
              <Select value={editForm.targetGrade} onValueChange={(v) => setEditForm((f) => ({ ...f, targetGrade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{subject.name}&rdquo;? All associated data including syllabus,
              assessments, attendance, notes, and exams will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--delulu-danger)] text-white hover:bg-[var(--delulu-danger)]/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
