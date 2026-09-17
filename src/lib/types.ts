export type DUCourseType = 'DSC' | 'DSE' | 'GE' | 'AECC' | 'SEC' | 'VC' | 'OE';

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  color: string;
  archived: boolean;
  grade?: string;
  officialGrade?: string;
  targetGrade?: string;
  createdAt: string;
  // DU-specific
  semester: number;
  courseType: DUCourseType;
  internalMarksMax: number;
  endSemMarksMax: number;
  internalMarksObtained?: number;
  endSemMarksObtained?: number;
  backlog?: boolean;
  upcCode?: string;
}

export interface SyllabusUnit {
  id: string;
  subjectId: string;
  name: string;
  order: number;
  topics: SyllabusTopic[];
}

export interface SyllabusTopic {
  id: string;
  unitId: string;
  subjectId: string;
  name: string;
  completed: boolean;
  order: number;
}

export interface Assessment {
  id: string;
  subjectId: string;
  name: string;
  category: 'ca_test' | 'assignment' | 'quiz' | 'practical' | 'other';
  maxMarks: number;
  obtainedMarks: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  present: boolean;
  totalClasses: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId?: string;
  topicName?: string;
  duration: number; // seconds
  date: string;
  type: 'focus' | 'revision';
  notes?: string;
}

export interface RevisionItem {
  id: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReview?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  subjectId?: string;
  topicId?: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  subjectId?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun
  startTime: string; // HH:mm
  endTime: string;
  room?: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: 'exam' | 'assignment' | 'deadline' | 'class' | 'task' | 'custom' | 'event';
  subjectId?: string;
  description?: string;
  color?: string;
  completed?: boolean;
}

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  maxMarks?: number;
  obtainedMarks?: number;
  createdAt: string;
}

export interface Exam {
  id: string;
  subjectId: string;
  name: string;
  date: string;
  type: 'midsem' | 'endsem' | 'quiz' | 'practical' | 'other';
  totalMarks: number;
  status: 'upcoming' | 'completed';
  obtainedMarks?: number;
  preparationNotes?: string;
  createdAt: string;
}

export interface PYQ {
  id: string;
  examId: string;
  subjectId: string;
  year: string;
  question: string;
  answer?: string;
  topicId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  attempted: boolean;
  correct?: boolean;
}

export interface ERPaper {
  id: string;
  subjectId: string;
  title: string;
  author: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  deadline?: string;
  url?: string;
  notes?: string;
  createdAt: string;
}

export interface ReEvalRequest {
  id: string;
  subjectId: string;
  subjectName: string;
  upcCode?: string;
  semester: number;
  originalMarks: number;
  maxMarks: number;
  status: 'draft' | 'submitted' | 'result-pending' | 'result-received';
  resultMarks?: number;
  feePaid?: boolean;
  submittedDate?: string;
  resultDate?: string;
  notes?: string;
}

export interface CUETScore {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  percentile?: number;
  year: number;
}

export interface Society {
  id: string;
  name: string;
  role: string;
  startDate: string;
  active: boolean;
  category: 'cultural' | 'sports' | 'academic' | 'social' | 'other';
  notes?: string;
}

export type FileKind = 'image' | 'pdf' | 'document' | 'video' | 'audio' | 'other';

export interface UserFile {
  id: string;
  name: string;           // display name with extension
  folderId: string | null; // null = root
  kind: FileKind;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  blobRef: string;        // IndexedDB key (same as id)
}

export interface UserFolder {
  id: string;
  name: string;
  parentId: string | null; // null = root
  createdAt: string;
}

// ─── Knowledge Tree ────────────────────────────────────────────────
// A user-owned hierarchy: the student decides how knowledge is organised.
// It is deliberately NOT tied to the university syllabus (see linkedSyllabusTopicId).

export type KnowledgeNodeType =
  | 'subject'
  | 'unit'
  | 'topic'
  | 'concept'
  | 'subtopic'
  | 'question'
  | 'resource'
  | 'note'
  | 'project'
  | 'custom';

export type KnowledgeStatus =
  | 'not_started'
  | 'learning'
  | 'understood'
  | 'needs_review'
  | 'mastered'
  | 'archived';

export interface KnowledgeNode {
  id: string;
  parentId: string | null;      // null = root
  title: string;
  type: KnowledgeNodeType;      // sensible default; user may ignore it
  status: KnowledgeStatus;
  progress: number;             // 0-100, manual or derived from children
  description?: string;
  subjectIds: string[];         // 0..n subjects (knowledge can outlive a semester)
  semester?: number | null;     // optional academic context
  tags: string[];
  priority?: 'low' | 'medium' | 'high';
  order: number;                // manual ordering among siblings
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * True when the user set `progress` by hand. When a node has children and this
   * is not true, the displayed progress is the rounded average of its children
   * (never a made-up number). Not part of the original brief, but required to
   * distinguish "manual" from "derived" progress without faking a value.
   */
  progressManual?: boolean;
  // optional references to existing records (no duplication of content)
  linkedNoteIds?: string[];
  linkedFileIds?: string[];
  linkedSyllabusTopicId?: string | null;
}

export interface PastSemester {
  sem: number;
  sgpa: number;
  credits: number;
}

export interface UserProfile {
  name: string;
  semester: number;
  branch: string;
  college: string;
  targetCGPA: number;
  attendanceThreshold: number;
  weeklyStudyGoalHours: number;
  // DU-specific
  course: string;
  nepBatch: boolean;
  currentSemester: number;
  category: 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'pwd';
  pastSemesters: PastSemester[];
}

export type ViewId =
  | 'dashboard'
  | 'subjects'
  | 'subject-detail'
  | 'syllabus'
  | 'marks'
  | 'attendance'
  | 'focus'
  | 'revision'
  | 'notes'
  | 'calendar'
  | 'timetable'
  | 'tasks'
  | 'analytics'
  | 'er-center'
  | 'exams'
  | 'assignments'
  | 'knowledge'
  | 'settings'
  | 'report'
  | 'files'
  | 'now';

export interface AppState {
  // Navigation
  currentView: ViewId;
  selectedSubjectId: string | null;
  previousView: ViewId | null;
  sidebarCollapsed: boolean;
  commandOpen: boolean;

  // Profile
  profile: UserProfile;

  // Data
  subjects: Subject[];
  syllabusUnits: SyllabusUnit[];
  assessments: Assessment[];
  attendance: AttendanceRecord[];
  studySessions: StudySession[];
  revisionItems: RevisionItem[];
  notes: Note[];
  tasks: Task[];
  timetableSlots: TimetableSlot[];
  calendarEvents: CalendarEvent[];
  assignments: Assignment[];
  exams: Exam[];
  pyqs: PYQ[];
  erPapers: ERPaper[];
  societies: Society[];
  reEvalRequests: ReEvalRequest[];
  cuetScores: CUETScore[];
  fileFolders: UserFolder[];
  userFiles: UserFile[];
  knowledgeNodes: KnowledgeNode[];
  selectedSemester: number | null;

  // Focus timer
  focusActive: boolean;
  hasOnboarded: boolean;
  focusSubjectId: string | null;
  focusTopicId: string | null;
  focusStartTime: number | null;
  focusElapsed: number;

  // Language & Leaderboard
  language: 'en' | 'hi';
  leaderboardOptIn: boolean;

  // Navigation actions
  navigate: (view: ViewId) => void;
  goBack: () => void;
  selectSubject: (id: string | null) => void;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;

  // Profile actions
  updateProfile: (profile: Partial<UserProfile>) => void;

  // Subject actions
  addSubject: (subject: Omit<Subject, 'id' | 'createdAt'>) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Syllabus actions
  addSyllabusUnit: (unit: Omit<SyllabusUnit, 'id' | 'topics'>) => void;
  updateSyllabusUnit: (id: string, data: Partial<SyllabusUnit>) => void;
  deleteSyllabusUnit: (id: string) => void;
  addSyllabusTopic: (topic: Omit<SyllabusTopic, 'id'>) => void;
  updateSyllabusTopic: (id: string, data: Partial<SyllabusTopic>) => void;
  deleteSyllabusTopic: (id: string) => void;
  toggleTopicComplete: (id: string) => void;

  // Assessment actions
  addAssessment: (assessment: Omit<Assessment, 'id' | 'createdAt'>) => void;
  updateAssessment: (id: string, data: Partial<Assessment>) => void;
  deleteAssessment: (id: string) => void;

  // Attendance actions
  addAttendance: (record: Omit<AttendanceRecord, 'id' | 'date'> & { date?: string }) => void;
  updateAttendance: (id: string, data: Partial<AttendanceRecord>) => void;
  deleteAttendance: (id: string) => void;

  // Study session actions
  addStudySession: (session: Omit<StudySession, 'id'>) => void;

  // Revision actions
  addRevisionItem: (item: Omit<RevisionItem, 'id' | 'createdAt'>) => void;
  updateRevisionItem: (id: string, data: Partial<RevisionItem>) => void;
  deleteRevisionItem: (id: string) => void;

  // Notes actions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;

  // Timetable actions
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  updateTimetableSlot: (id: string, data: Partial<TimetableSlot>) => void;
  deleteTimetableSlot: (id: string) => void;

  // Calendar actions
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  // Assignment actions
  addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  updateAssignment: (id: string, data: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;

  // Exam actions
  addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => void;
  updateExam: (id: string, data: Partial<Exam>) => void;
  deleteExam: (id: string) => void;

  // PYQ actions
  addPYQ: (pyq: Omit<PYQ, 'id'>) => void;
  updatePYQ: (id: string, data: Partial<PYQ>) => void;
  deletePYQ: (id: string) => void;

  // ER actions
  addERPaper: (paper: Omit<ERPaper, 'id' | 'createdAt'>) => void;
  updateERPaper: (id: string, data: Partial<ERPaper>) => void;
  deleteERPaper: (id: string) => void;

  // Society actions
  addSociety: (society: Omit<Society, 'id'>) => void;
  updateSociety: (id: string, data: Partial<Society>) => void;
  removeSociety: (id: string) => void;

  // Re-evaluation actions
  addReEvalRequest: (request: Omit<ReEvalRequest, 'id'>) => void;
  updateReEvalRequest: (id: string, data: Partial<ReEvalRequest>) => void;
  removeReEvalRequest: (id: string) => void;

  // CUET score actions
  addCUETScore: (score: Omit<CUETScore, 'id'>) => void;
  updateCUETScore: (id: string, data: Partial<CUETScore>) => void;
  removeCUETScore: (id: string) => void;

  // File manager actions
  addFolder: (folder: Omit<UserFolder, 'id' | 'createdAt'>) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  addFile: (file: Omit<UserFile, 'id' | 'createdAt' | 'blobRef'> & { blobRef?: string }) => void;
  renameFile: (id: string, name: string) => void;
  deleteFile: (id: string) => void;
  moveFile: (id: string, folderId: string | null) => void;
  setSelectedSemester: (sem: number | null) => void;

  // Knowledge tree actions (user-owned hierarchy — unlimited depth)
  addKnowledgeNode: (node: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateKnowledgeNode: (id: string, data: Partial<KnowledgeNode>) => void;
  deleteKnowledgeNode: (id: string) => void;
  moveKnowledgeNode: (id: string, newParentId: string | null, newOrder?: number) => void;
  duplicateKnowledgeNode: (id: string) => void;
  archiveKnowledgeNode: (id: string, archived: boolean) => void;
  reorderKnowledgeNode: (id: string, newOrder: number) => void;

  // Focus actions
  startFocus: (subjectId: string, topicId?: string, topicName?: string) => void;
  stopFocus: (notes?: string, topicName?: string) => void;
  setFocusElapsed: (seconds: number) => void;

  // Language & Leaderboard actions
  setLanguage: (language: 'en' | 'hi') => void;
  setLeaderboardOptIn: (optIn: boolean) => void;

  // Data management
  exportData: () => string;
  importData: (json: string) => void;
  restoreDemoData: () => void;
  completeOnboarding: () => void;
  loadDemoData: () => void;
  resetState: () => void;
}

// Grade point mapping
export const GRADE_POINTS: Record<string, number> = {
  O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, F: 0,
};

export const GRADE_FROM_PERCENTAGE = (pct: number): string => {
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 55) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

export const SUBJECT_COLORS = [
  '#635BFF', '#E5484D', '#16A36A', '#D99200', '#3478F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
  '#84CC16', '#F43F5E', '#A855F7', '#22D3EE', '#FB923C',
];

/** CGPA to Percentage: official DU formula % = CGPA × 9.5 (UGC CBCS multiplier, adopted by DU from 2018-19) */
export function cgpaToPercentage(cgpa: number): number {
  return Math.round(cgpa * 9.5 * 100) / 100;
}

export type SignalStatus = 'healthy' | 'improving' | 'attention' | 'critical' | 'upcoming' | 'nodata';

export const SIGNAL_COLORS: Record<SignalStatus, string> = {
  healthy: 'var(--delulu-success)',
  improving: 'var(--delulu-info)',
  attention: 'var(--delulu-warning)',
  critical: 'var(--delulu-danger)',
  upcoming: 'var(--delulu-purple)',
  nodata: 'var(--muted-foreground)',
};
