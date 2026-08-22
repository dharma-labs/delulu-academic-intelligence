import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppState,
  Subject,
  SyllabusUnit,
  SyllabusTopic,
  Assessment,
  AttendanceRecord,
  StudySession,
  RevisionItem,
  Note,
  Task,
  TimetableSlot,
  CalendarEvent,
  Assignment,
  Exam,
  PYQ,
  ERPaper,
  UserProfile,
  SignalStatus,
} from './types';
import { GRADE_POINTS, GRADE_FROM_PERCENTAGE } from './types';

// ─── Default Profile ───────────────────────────────────────────────
const DEFAULT_PROFILE: UserProfile = {
  name: 'Student',
  semester: 1,
  branch: '',
  college: '',
  targetCGPA: 8.5,
  attendanceThreshold: 75,
  weeklyStudyGoalHours: 10,
};

// ─── Date helpers ──────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const uid = () => crypto.randomUUID();

// ─── Demo Seed Data ────────────────────────────────────────────────
function seedDemoData() {
  const now = new Date().toISOString();
  const subjects: Subject[] = [
    { id: 's1', name: 'Data Structures', code: 'CS201', credits: 4, color: '#635BFF', archived: false, createdAt: now },
    { id: 's2', name: 'Discrete Mathematics', code: 'MA201', credits: 3, color: '#16A36A', archived: false, createdAt: now },
    { id: 's3', name: 'Digital Logic Design', code: 'EC201', credits: 3, color: '#E5484D', archived: false, createdAt: now },
    { id: 's4', name: 'Operating Systems', code: 'CS202', credits: 4, color: '#D99200', archived: false, createdAt: now },
    { id: 's5', name: 'Computer Networks', code: 'CS203', credits: 3, color: '#8B5CF6', archived: false, createdAt: now },
  ];

  const syllabusUnits: SyllabusUnit[] = [
    // CS201 Data Structures
    { id: 'u1', subjectId: 's1', name: 'Arrays & Strings', order: 1, topics: [
      { id: 't1', unitId: 'u1', subjectId: 's1', name: '1D & 2D Arrays', completed: true, order: 1 },
      { id: 't2', unitId: 'u1', subjectId: 's1', name: 'String Manipulation', completed: true, order: 2 },
      { id: 't3', unitId: 'u1', subjectId: 's1', name: 'Array ADT Operations', completed: false, order: 3 },
    ]},
    { id: 'u2', subjectId: 's1', name: 'Linked Lists', order: 2, topics: [
      { id: 't4', unitId: 'u2', subjectId: 's1', name: 'Singly Linked List', completed: true, order: 1 },
      { id: 't5', unitId: 'u2', subjectId: 's1', name: 'Doubly Linked List', completed: false, order: 2 },
      { id: 't6', unitId: 'u2', subjectId: 's1', name: 'Circular Linked List', completed: false, order: 3 },
    ]},
    { id: 'u3', subjectId: 's1', name: 'Trees & Graphs', order: 3, topics: [
      { id: 't7', unitId: 'u3', subjectId: 's1', name: 'Binary Trees', completed: false, order: 1 },
      { id: 't8', unitId: 'u3', subjectId: 's1', name: 'BST & AVL Trees', completed: false, order: 2 },
      { id: 't9', unitId: 'u3', subjectId: 's1', name: 'Graph Traversals', completed: false, order: 3 },
    ]},
    // MA201 Discrete Math
    { id: 'u4', subjectId: 's2', name: 'Set Theory & Logic', order: 1, topics: [
      { id: 't10', unitId: 'u4', subjectId: 's2', name: 'Propositional Logic', completed: true, order: 1 },
      { id: 't11', unitId: 'u4', subjectId: 's2', name: 'Predicate Logic', completed: false, order: 2 },
      { id: 't12', unitId: 'u4', subjectId: 's2', name: 'Set Operations', completed: true, order: 3 },
    ]},
    { id: 'u5', subjectId: 's2', name: 'Combinatorics', order: 2, topics: [
      { id: 't13', unitId: 'u5', subjectId: 's2', name: 'Permutations & Combinations', completed: false, order: 1 },
      { id: 't14', unitId: 'u5', subjectId: 's2', name: 'Pigeonhole Principle', completed: false, order: 2 },
    ]},
    // EC201 Digital Logic
    { id: 'u6', subjectId: 's3', name: 'Number Systems & Codes', order: 1, topics: [
      { id: 't15', unitId: 'u6', subjectId: 's3', name: 'Binary & Hexadecimal', completed: true, order: 1 },
      { id: 't16', unitId: 'u6', subjectId: 's3', name: 'BCD & Gray Code', completed: true, order: 2 },
    ]},
    { id: 'u7', subjectId: 's3', name: 'Combinational Logic', order: 2, topics: [
      { id: 't17', unitId: 'u7', subjectId: 's3', name: 'Logic Gates & Boolean Algebra', completed: false, order: 1 },
      { id: 't18', unitId: 'u7', subjectId: 's3', name: 'K-Map Simplification', completed: false, order: 2 },
    ]},
    // CS202 Operating Systems
    { id: 'u8', subjectId: 's4', name: 'Process Management', order: 1, topics: [
      { id: 't19', unitId: 'u8', subjectId: 's4', name: 'Process States & Scheduling', completed: true, order: 1 },
      { id: 't20', unitId: 'u8', subjectId: 's4', name: 'CPU Scheduling Algorithms', completed: false, order: 2 },
      { id: 't21', unitId: 'u8', subjectId: 's4', name: 'Deadlocks', completed: false, order: 3 },
    ]},
    { id: 'u9', subjectId: 's4', name: 'Memory Management', order: 2, topics: [
      { id: 't22', unitId: 'u9', subjectId: 's4', name: 'Paging & Segmentation', completed: false, order: 1 },
      { id: 't23', unitId: 'u9', subjectId: 's4', name: 'Virtual Memory', completed: false, order: 2 },
    ]},
    // CS203 Computer Networks
    { id: 'u10', subjectId: 's5', name: 'OSI & TCP/IP Models', order: 1, topics: [
      { id: 't24', unitId: 'u10', subjectId: 's5', name: 'OSI Layers', completed: true, order: 1 },
      { id: 't25', unitId: 'u10', subjectId: 's5', name: 'TCP/IP Stack', completed: true, order: 2 },
    ]},
    { id: 'u11', subjectId: 's5', name: 'Data Link Layer', order: 2, topics: [
      { id: 't26', unitId: 'u11', subjectId: 's5', name: 'Error Detection & Correction', completed: false, order: 1 },
      { id: 't27', unitId: 'u11', subjectId: 's5', name: 'Flow Control Protocols', completed: false, order: 2 },
    ]},
  ];

  const assessments: Assessment[] = [
    { id: 'a1', subjectId: 's1', name: 'CA Test 1', category: 'ca_test', maxMarks: 30, obtainedMarks: 24, date: daysAgo(14), notes: 'Arrays & Strings', createdAt: now },
    { id: 'a2', subjectId: 's1', name: 'Assignment 1', category: 'assignment', maxMarks: 20, obtainedMarks: 18, date: daysAgo(10), notes: 'Linked List Implementation', createdAt: now },
    { id: 'a3', subjectId: 's2', name: 'CA Test 1', category: 'ca_test', maxMarks: 30, obtainedMarks: 27, date: daysAgo(12), notes: 'Logic & Sets', createdAt: now },
    { id: 'a4', subjectId: 's3', name: 'Quiz 1', category: 'quiz', maxMarks: 10, obtainedMarks: 8, date: daysAgo(7), notes: 'Number Systems', createdAt: now },
    { id: 'a5', subjectId: 's4', name: 'CA Test 1', category: 'ca_test', maxMarks: 30, obtainedMarks: 21, date: daysAgo(5), notes: 'Process Management', createdAt: now },
    { id: 'a6', subjectId: 's5', name: 'Assignment 1', category: 'assignment', maxMarks: 15, obtainedMarks: 12, date: daysAgo(3), notes: 'OSI Model', createdAt: now },
  ];

  // Generate attendance for past 20 working days (skip weekends)
  const attendance: AttendanceRecord[] = [];
  const dayNames = [0, 1, 2, 3, 4]; // Mon-Fri
  let classCount = 0;
  for (let d = 20; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const dateStr = date.toISOString().split('T')[0];
    // Each subject has class on certain days
    const subjectsToday = subjects.filter((_, i) => {
      // Rough schedule: Mon/Wed s1,s3,s5  Tue/Thu s2,s4
      if ((dow === 1 || dow === 3) && (i === 0 || i === 2 || i === 4)) return true;
      if ((dow === 2 || dow === 4) && (i === 1 || i === 3)) return true;
      if (dow === 5 && i < 3) return true; // Friday lab-like
      return false;
    });
    for (const sub of subjectsToday) {
      const present = Math.random() > 0.2; // 80% attendance
      attendance.push({ id: uid(), subjectId: sub.id, date: dateStr, present, totalClasses: 1 });
    }
    classCount++;
    if (classCount > 15) break; // limit records
  }

  const tasks: Task[] = [
    { id: 'tk1', title: 'Complete Linked List Assignment', description: 'Implement doubly linked list with all operations', priority: 'high', subjectId: 's1', dueDate: todayStr(), completed: false, createdAt: now },
    { id: 'tk2', title: 'Practice K-Map problems', priority: 'medium', subjectId: 's3', dueDate: daysFromNow(2), completed: false, createdAt: now },
    { id: 'tk3', title: 'Read Chapter 5 - Memory Management', priority: 'low', subjectId: 's4', dueDate: daysFromNow(5), completed: false, createdAt: now },
    { id: 'tk4', title: 'Solve combinatorics worksheet', priority: 'high', subjectId: 's2', dueDate: daysAgo(1), completed: false, createdAt: now },
    { id: 'tk5', title: 'Submit Digital Logic lab report', priority: 'high', subjectId: 's3', dueDate: daysAgo(2), completed: true, createdAt: now },
    { id: 'tk6', title: 'Revise OSI model notes', priority: 'medium', subjectId: 's5', dueDate: todayStr(), completed: false, createdAt: now },
  ];

  const timetableSlots: TimetableSlot[] = [
    { id: 'ts1', subjectId: 's1', day: 1, startTime: '09:00', endTime: '10:00', room: 'LH-201', type: 'lecture' },
    { id: 'ts2', subjectId: 's3', day: 1, startTime: '10:00', endTime: '11:00', room: 'LH-201', type: 'lecture' },
    { id: 'ts3', subjectId: 's5', day: 1, startTime: '14:00', endTime: '15:00', room: 'LH-301', type: 'lecture' },
    { id: 'ts4', subjectId: 's2', day: 2, startTime: '09:00', endTime: '10:00', room: 'LH-105', type: 'lecture' },
    { id: 'ts5', subjectId: 's4', day: 2, startTime: '10:00', endTime: '11:30', room: 'LH-105', type: 'lecture' },
    { id: 'ts6', subjectId: 's1', day: 3, startTime: '09:00', endTime: '10:00', room: 'LH-201', type: 'lecture' },
    { id: 'ts7', subjectId: 's3', day: 3, startTime: '11:00', endTime: '13:00', room: 'Lab-3', type: 'lab' },
    { id: 'ts8', subjectId: 's2', day: 4, startTime: '09:00', endTime: '10:00', room: 'LH-105', type: 'lecture' },
    { id: 'ts9', subjectId: 's4', day: 4, startTime: '10:00', endTime: '11:00', room: 'LH-301', type: 'lecture' },
    { id: 'ts10', subjectId: 's5', day: 4, startTime: '14:00', endTime: '15:00', room: 'LH-201', type: 'tutorial' },
    { id: 'ts11', subjectId: 's1', day: 5, startTime: '10:00', endTime: '12:00', room: 'Lab-1', type: 'lab' },
    { id: 'ts12', subjectId: 's3', day: 5, startTime: '14:00', endTime: '15:00', room: 'LH-301', type: 'tutorial' },
  ];

  const revisionItems: RevisionItem[] = [
    { id: 'r1', subjectId: 's1', topicId: 't1', topicName: '1D & 2D Arrays', easeFactor: 2.5, interval: 6, repetitions: 2, nextReview: daysFromNow(3), lastReview: daysAgo(3), createdAt: now },
    { id: 'r2', subjectId: 's1', topicId: 't4', topicName: 'Singly Linked List', easeFactor: 2.3, interval: 4, repetitions: 1, nextReview: todayStr(), lastReview: daysAgo(4), createdAt: now },
    { id: 'r3', subjectId: 's2', topicId: 't10', topicName: 'Propositional Logic', easeFactor: 2.6, interval: 8, repetitions: 3, nextReview: daysFromNow(5), lastReview: daysAgo(5), createdAt: now },
    { id: 'r4', subjectId: 's3', topicId: 't15', topicName: 'Binary & Hexadecimal', easeFactor: 2.4, interval: 1, repetitions: 0, nextReview: daysAgo(2), lastReview: daysAgo(5), createdAt: now },
    { id: 'r5', subjectId: 's4', topicId: 't19', topicName: 'Process States & Scheduling', easeFactor: 2.2, interval: 3, repetitions: 1, nextReview: todayStr(), lastReview: daysAgo(3), createdAt: now },
  ];

  const calendarEvents: CalendarEvent[] = [
    { id: 'ce1', title: 'Mid-Semester Exams Begin', date: daysFromNow(21), type: 'exam', color: '#E5484D' },
    { id: 'ce2', title: 'DS CA Test 2', date: daysFromNow(10), type: 'exam', subjectId: 's1', color: '#635BFF' },
    { id: 'ce3', title: 'OS Lab Submission', date: daysFromNow(5), type: 'deadline', subjectId: 's4', color: '#D99200' },
  ];

  // ─── Study Sessions (realistic seed data) ──────────────────────
  const studySessions: StudySession[] = [];
  // Generate sessions for the past 14 days
  const sessionPatterns: { subjectId: string; topicName: string; minDur: number; maxDur: number; daysBack: number }[] = [
    { subjectId: 's1', topicName: '1D & 2D Arrays', minDur: 1800, maxDur: 3600, daysBack: 13 },
    { subjectId: 's1', topicName: 'Linked List Traversal', minDur: 2400, maxDur: 4200, daysBack: 12 },
    { subjectId: 's2', topicName: 'Propositional Logic', minDur: 1500, maxDur: 2700, daysBack: 11 },
    { subjectId: 's3', topicName: 'Binary & Hexadecimal', minDur: 1200, maxDur: 2400, daysBack: 10 },
    { subjectId: 's1', topicName: 'Singly Linked List', minDur: 3000, maxDur: 5400, daysBack: 9 },
    { subjectId: 's4', topicName: 'Process States', minDur: 1800, maxDur: 3600, daysBack: 8 },
    { subjectId: 's2', topicName: 'Set Operations', minDur: 2100, maxDur: 3600, daysBack: 7 },
    { subjectId: 's5', topicName: 'OSI Layers', minDur: 1500, maxDur: 2700, daysBack: 6 },
    { subjectId: 's1', topicName: 'String Manipulation', minDur: 2400, maxDur: 4200, daysBack: 5 },
    { subjectId: 's3', topicName: 'BCD & Gray Code', minDur: 1200, maxDur: 2400, daysBack: 5 },
    { subjectId: 's4', topicName: 'CPU Scheduling', minDur: 3000, maxDur: 5400, daysBack: 4 },
    { subjectId: 's2', topicName: 'Permutations & Combinations', minDur: 1800, maxDur: 3000, daysBack: 3 },
    { subjectId: 's5', topicName: 'TCP/IP Stack', minDur: 2100, maxDur: 3600, daysBack: 3 },
    { subjectId: 's1', topicName: 'Binary Trees', minDur: 2700, maxDur: 4800, daysBack: 2 },
    { subjectId: 's4', topicName: 'Process Scheduling', minDur: 3600, maxDur: 5400, daysBack: 2 },
    { subjectId: 's3', topicName: 'Logic Gates', minDur: 1500, maxDur: 3000, daysBack: 1 },
    { subjectId: 's5', topicName: 'Error Detection', minDur: 1800, maxDur: 2700, daysBack: 1 },
    { subjectId: 's2', topicName: 'Set Theory Review', minDur: 2100, maxDur: 3600, daysBack: 0 },
    { subjectId: 's1', topicName: 'BST & AVL Trees', minDur: 2400, maxDur: 4200, daysBack: 0 },
  ];
  for (const sp of sessionPatterns) {
    const dur = sp.minDur + Math.floor(Math.random() * (sp.maxDur - sp.minDur));
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - sp.daysBack);
    const dateStr = dateObj.toISOString().split('T')[0];
    studySessions.push({ id: uid(), subjectId: sp.subjectId, topicName: sp.topicName, duration: dur, date: dateStr, type: 'focus' });
  }
  // Add a few revision sessions
  studySessions.push(
    { id: uid(), subjectId: 's1', topicName: 'Arrays Review', duration: 1200, date: daysAgo(3), type: 'revision' },
    { id: uid(), subjectId: 's2', topicName: 'Logic Review', duration: 900, date: daysAgo(1), type: 'revision' },
    { id: uid(), subjectId: 's4', topicName: 'Process States Review', duration: 1500, date: daysAgo(0), type: 'revision' },
  );

  const assignments: Assignment[] = [
    { id: 'as1', subjectId: 's1', title: 'Binary Tree Implementation', description: 'Implement BST with insert, delete, search', deadline: daysFromNow(7), priority: 'high', status: 'upcoming', createdAt: now },
    { id: 'as2', subjectId: 's2', title: 'Proof Techniques Worksheet', deadline: daysFromNow(4), priority: 'medium', status: 'due_soon', createdAt: now },
  ];

  const exams: Exam[] = [
    { id: 'ex1', subjectId: 's1', name: 'CA Test 2 - Data Structures', date: daysFromNow(10), type: 'midsem', totalMarks: 30, status: 'upcoming', createdAt: now },
    { id: 'ex2', subjectId: 's4', name: 'Mid-Sem - Operating Systems', date: daysFromNow(24), type: 'midsem', totalMarks: 40, status: 'upcoming', createdAt: now },
  ];

  const notes: Note[] = [
    { id: 'n1', subjectId: 's1', topicId: 't4', title: 'Linked List Traversal Notes', content: '## Singly Linked List\n\nKey points:\n- Head pointer tracks first node\n- Traversal uses temporary pointer\n- O(n) for search, O(1) for insert at head', createdAt: now, updatedAt: now },
    { id: 'n2', subjectId: 's2', topicId: 't10', title: 'Truth Tables Quick Reference', content: '## Propositional Logic\n\n- Conjunction (AND): p ∧ q\n- Disjunction (OR): p ∨ q\n- Implication: p → q\n- Biconditional: p ↔ q', createdAt: now, updatedAt: now },
  ];

  return {
    subjects,
    syllabusUnits,
    assessments,
    attendance,
    tasks,
    timetableSlots,
    revisionItems,
    calendarEvents,
    assignments,
    exams,
    notes,
    studySessions,
    pyqs: [] as PYQ[],
    erPapers: [] as ERPaper[],
  };
}

// ─── Store Creation ─────────────────────────────────────────────────
export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const seed = seedDemoData();

      return {
        // ── Navigation ──
        currentView: 'dashboard' as const,
        selectedSubjectId: null,
        previousView: null,
        sidebarCollapsed: false,
        commandOpen: false,

        // ── Profile ──
        profile: { ...DEFAULT_PROFILE },

        // ── Data (seeded) ──
        subjects: seed.subjects,
        syllabusUnits: seed.syllabusUnits,
        assessments: seed.assessments,
        attendance: seed.attendance,
        studySessions: seed.studySessions,
        revisionItems: seed.revisionItems,
        notes: seed.notes,
        tasks: seed.tasks,
        timetableSlots: seed.timetableSlots,
        calendarEvents: seed.calendarEvents,
        assignments: seed.assignments,
        exams: seed.exams,
        pyqs: seed.pyqs,
        erPapers: seed.erPapers,

        // ── Focus Timer ──
        focusActive: false,
        focusSubjectId: null,
        focusTopicId: null,
        focusStartTime: null,
        focusElapsed: 0,

        // ═══════════════════════════════════════════════════════════════
        // Navigation Actions
        // ═══════════════════════════════════════════════════════════════
        navigate: (view) =>
          set((state) => ({
            previousView: state.currentView,
            currentView: view,
          })),

        goBack: () =>
          set((state) => {
            if (state.previousView) {
              const prev = state.previousView;
              return { currentView: prev, previousView: null };
            }
            return { currentView: 'dashboard' as const, previousView: null };
          }),

        selectSubject: (id) => set({ selectedSubjectId: id }),

        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

        setCommandOpen: (open) => set({ commandOpen: open }),

        // ═══════════════════════════════════════════════════════════════
        // Profile Actions
        // ═══════════════════════════════════════════════════════════════
        updateProfile: (data) =>
          set((state) => ({
            profile: { ...state.profile, ...data },
          })),

        // ═══════════════════════════════════════════════════════════════
        // Subject Actions
        // ═══════════════════════════════════════════════════════════════
        addSubject: (subject) =>
          set((state) => ({
            subjects: [
              ...state.subjects,
              { ...subject, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateSubject: (id, data) =>
          set((state) => ({
            subjects: state.subjects.map((s) =>
              s.id === id ? { ...s, ...data } : s
            ),
          })),

        deleteSubject: (id) =>
          set((state) => ({
            subjects: state.subjects.filter((s) => s.id !== id),
            syllabusUnits: state.syllabusUnits.filter((u) => u.subjectId !== id),
            assessments: state.assessments.filter((a) => a.subjectId !== id),
            attendance: state.attendance.filter((a) => a.subjectId !== id),
            studySessions: state.studySessions.filter((s) => s.subjectId !== id),
            revisionItems: state.revisionItems.filter((r) => r.subjectId !== id),
            notes: state.notes.filter((n) => n.subjectId !== id),
            tasks: state.tasks.filter((t) => t.subjectId !== id),
            timetableSlots: state.timetableSlots.filter((t) => t.subjectId !== id),
            calendarEvents: state.calendarEvents.filter((e) => e.subjectId !== id),
            assignments: state.assignments.filter((a) => a.subjectId !== id),
            exams: state.exams.filter((e) => e.subjectId !== id),
            pyqs: state.pyqs.filter((p) => p.subjectId !== id),
            erPapers: state.erPapers.filter((e) => e.subjectId !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Syllabus Actions
        // ═══════════════════════════════════════════════════════════════
        addSyllabusUnit: (unit) =>
          set((state) => ({
            syllabusUnits: [
              ...state.syllabusUnits,
              { ...unit, id: uid(), topics: [] },
            ],
          })),

        updateSyllabusUnit: (id, data) =>
          set((state) => ({
            syllabusUnits: state.syllabusUnits.map((u) =>
              u.id === id ? { ...u, ...data } : u
            ),
          })),

        deleteSyllabusUnit: (id) =>
          set((state) => ({
            syllabusUnits: state.syllabusUnits.filter((u) => u.id !== id),
            revisionItems: state.revisionItems.filter((r) => {
              const unit = state.syllabusUnits.find((u) => u.id === id);
              return !unit || !unit.topics.some((t) => t.id === r.topicId);
            }),
          })),

        addSyllabusTopic: (topic) =>
          set((state) => ({
            syllabusUnits: state.syllabusUnits.map((u) =>
              u.id === topic.unitId
                ? {
                    ...u,
                    topics: [...u.topics, { ...topic, id: uid() }],
                  }
                : u
            ),
          })),

        updateSyllabusTopic: (id, data) =>
          set((state) => ({
            syllabusUnits: state.syllabusUnits.map((u) => ({
              ...u,
              topics: u.topics.map((t) =>
                t.id === id ? { ...t, ...data } : t
              ),
            })),
          })),

        deleteSyllabusTopic: (id) =>
          set((state) => ({
            syllabusUnits: state.syllabusUnits.map((u) => ({
              ...u,
              topics: u.topics.filter((t) => t.id !== id),
            })),
            revisionItems: state.revisionItems.filter((r) => r.topicId !== id),
          })),

        toggleTopicComplete: (id) =>
          set((state) => ({
            syllabusUnits: state.syllabusUnits.map((u) => ({
              ...u,
              topics: u.topics.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t
              ),
            })),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Assessment Actions
        // ═══════════════════════════════════════════════════════════════
        addAssessment: (assessment) =>
          set((state) => ({
            assessments: [
              ...state.assessments,
              { ...assessment, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateAssessment: (id, data) =>
          set((state) => ({
            assessments: state.assessments.map((a) =>
              a.id === id ? { ...a, ...data } : a
            ),
          })),

        deleteAssessment: (id) =>
          set((state) => ({
            assessments: state.assessments.filter((a) => a.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Attendance Actions
        // ═══════════════════════════════════════════════════════════════
        addAttendance: (record) =>
          set((state) => ({
            attendance: [...state.attendance, { ...record, id: uid() }],
          })),

        updateAttendance: (id, data) =>
          set((state) => ({
            attendance: state.attendance.map((a) =>
              a.id === id ? { ...a, ...data } : a
            ),
          })),

        deleteAttendance: (id) =>
          set((state) => ({
            attendance: state.attendance.filter((a) => a.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Study Session Actions
        // ═══════════════════════════════════════════════════════════════
        addStudySession: (session) =>
          set((state) => ({
            studySessions: [
              ...state.studySessions,
              { ...session, id: uid() },
            ],
          })),

        // ═══════════════════════════════════════════════════════════════
        // Revision Actions (with SM-2 algorithm)
        // ═══════════════════════════════════════════════════════════════
        addRevisionItem: (item) =>
          set((state) => ({
            revisionItems: [
              ...state.revisionItems,
              { ...item, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateRevisionItem: (id, data) =>
          set((state) => ({
            revisionItems: state.revisionItems.map((r) =>
              r.id === id ? { ...r, ...data } : r
            ),
          })),

        deleteRevisionItem: (id) =>
          set((state) => ({
            revisionItems: state.revisionItems.filter((r) => r.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Notes Actions
        // ═══════════════════════════════════════════════════════════════
        addNote: (note) => {
          const now = new Date().toISOString();
          set((state) => ({
            notes: [
              ...state.notes,
              { ...note, id: uid(), createdAt: now, updatedAt: now },
            ],
          }));
        },

        updateNote: (id, data) =>
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === id
                ? { ...n, ...data, updatedAt: new Date().toISOString() }
                : n
            ),
          })),

        deleteNote: (id) =>
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Task Actions
        // ═══════════════════════════════════════════════════════════════
        addTask: (task) =>
          set((state) => ({
            tasks: [
              ...state.tasks,
              { ...task, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateTask: (id, data) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...data } : t
            ),
          })),

        deleteTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
          })),

        toggleTaskComplete: (id) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, completed: !t.completed } : t
            ),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Timetable Actions
        // ═══════════════════════════════════════════════════════════════
        addTimetableSlot: (slot) =>
          set((state) => ({
            timetableSlots: [...state.timetableSlots, { ...slot, id: uid() }],
          })),

        updateTimetableSlot: (id, data) =>
          set((state) => ({
            timetableSlots: state.timetableSlots.map((t) =>
              t.id === id ? { ...t, ...data } : t
            ),
          })),

        deleteTimetableSlot: (id) =>
          set((state) => ({
            timetableSlots: state.timetableSlots.filter((t) => t.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Calendar Actions
        // ═══════════════════════════════════════════════════════════════
        addCalendarEvent: (event) =>
          set((state) => ({
            calendarEvents: [...state.calendarEvents, { ...event, id: uid() }],
          })),

        updateCalendarEvent: (id, data) =>
          set((state) => ({
            calendarEvents: state.calendarEvents.map((e) =>
              e.id === id ? { ...e, ...data } : e
            ),
          })),

        deleteCalendarEvent: (id) =>
          set((state) => ({
            calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Assignment Actions
        // ═══════════════════════════════════════════════════════════════
        addAssignment: (assignment) =>
          set((state) => ({
            assignments: [
              ...state.assignments,
              { ...assignment, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateAssignment: (id, data) =>
          set((state) => ({
            assignments: state.assignments.map((a) =>
              a.id === id ? { ...a, ...data } : a
            ),
          })),

        deleteAssignment: (id) =>
          set((state) => ({
            assignments: state.assignments.filter((a) => a.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Exam Actions
        // ═══════════════════════════════════════════════════════════════
        addExam: (exam) =>
          set((state) => ({
            exams: [
              ...state.exams,
              { ...exam, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateExam: (id, data) =>
          set((state) => ({
            exams: state.exams.map((e) =>
              e.id === id ? { ...e, ...data } : e
            ),
          })),

        deleteExam: (id) =>
          set((state) => ({
            exams: state.exams.filter((e) => e.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // PYQ Actions
        // ═══════════════════════════════════════════════════════════════
        addPYQ: (pyq) =>
          set((state) => ({
            pyqs: [...state.pyqs, { ...pyq, id: uid() }],
          })),

        updatePYQ: (id, data) =>
          set((state) => ({
            pyqs: state.pyqs.map((p) =>
              p.id === id ? { ...p, ...data } : p
            ),
          })),

        deletePYQ: (id) =>
          set((state) => ({
            pyqs: state.pyqs.filter((p) => p.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // ER Paper Actions
        // ═══════════════════════════════════════════════════════════════
        addERPaper: (paper) =>
          set((state) => ({
            erPapers: [
              ...state.erPapers,
              { ...paper, id: uid(), createdAt: new Date().toISOString() },
            ],
          })),

        updateERPaper: (id, data) =>
          set((state) => ({
            erPapers: state.erPapers.map((e) =>
              e.id === id ? { ...e, ...data } : e
            ),
          })),

        deleteERPaper: (id) =>
          set((state) => ({
            erPapers: state.erPapers.filter((e) => e.id !== id),
          })),

        // ═══════════════════════════════════════════════════════════════
        // Focus Actions
        // ═══════════════════════════════════════════════════════════════
        startFocus: (subjectId, topicId, topicName) =>
          set({
            focusActive: true,
            focusSubjectId: subjectId,
            focusTopicId: topicId ?? null,
            focusStartTime: Date.now(),
            focusElapsed: 0,
          }),

        stopFocus: (notes) => {
          const state = get();
          if (!state.focusActive || !state.focusStartTime || !state.focusSubjectId) return;

          const duration = Math.round((Date.now() - state.focusStartTime) / 1000);
          const session: StudySession = {
            id: uid(),
            subjectId: state.focusSubjectId,
            topicId: state.focusTopicId ?? undefined,
            topicName: state.focusTopicId
              ? state.revisionItems.find((r) => r.topicId === state.focusTopicId)?.topicName
              : topicName,
            duration,
            date: todayStr(),
            type: 'focus',
            notes,
          };

          set({
            focusActive: false,
            focusSubjectId: null,
            focusTopicId: null,
            focusStartTime: null,
            focusElapsed: 0,
            studySessions: [...state.studySessions, session],
          });
        },

        // ═══════════════════════════════════════════════════════════════
        // Data Management
        // ═══════════════════════════════════════════════════════════════
        exportData: () => {
          const state = get();
          const dataToExport = {
            profile: state.profile,
            subjects: state.subjects,
            syllabusUnits: state.syllabusUnits,
            assessments: state.assessments,
            attendance: state.attendance,
            studySessions: state.studySessions,
            revisionItems: state.revisionItems,
            notes: state.notes,
            tasks: state.tasks,
            timetableSlots: state.timetableSlots,
            calendarEvents: state.calendarEvents,
            assignments: state.assignments,
            exams: state.exams,
            pyqs: state.pyqs,
            erPapers: state.erPapers,
          };
          return JSON.stringify(dataToExport, null, 2);
        },

        importData: (json) => {
          try {
            const data = JSON.parse(json);
            if (typeof data !== 'object' || data === null) {
              throw new Error('Invalid data format');
            }

            // Validate required fields
            const validKeys: (keyof typeof data)[] = [
              'profile', 'subjects', 'syllabusUnits', 'assessments',
              'attendance', 'studySessions', 'revisionItems', 'notes',
              'tasks', 'timetableSlots', 'calendarEvents', 'assignments',
              'exams', 'pyqs', 'erPapers',
            ];

            const updates: Partial<AppState> = {};
            for (const key of validKeys) {
              if (Array.isArray(data[key]) || (key === 'profile' && typeof data[key] === 'object')) {
                (updates as Record<string, unknown>)[key] = data[key];
              }
            }

            set({
              ...updates,
              profile: data.profile ? { ...DEFAULT_PROFILE, ...data.profile } : DEFAULT_PROFILE,
            } as Partial<AppState>);
          } catch {
            console.error('Failed to import data: invalid JSON or structure');
          }
        },

        resetData: () => {
          const seed = seedDemoData();
          set({
            profile: { ...DEFAULT_PROFILE },
            subjects: seed.subjects,
            syllabusUnits: seed.syllabusUnits,
            assessments: seed.assessments,
            attendance: seed.attendance,
            studySessions: [],
            revisionItems: seed.revisionItems,
            notes: seed.notes,
            tasks: seed.tasks,
            timetableSlots: seed.timetableSlots,
            calendarEvents: seed.calendarEvents,
            assignments: seed.assignments,
            exams: seed.exams,
            pyqs: [],
            erPapers: [],
            currentView: 'dashboard' as const,
            selectedSubjectId: null,
            previousView: null,
            focusActive: false,
            focusSubjectId: null,
            focusTopicId: null,
            focusStartTime: null,
            focusElapsed: 0,
          });
        },

        resetState: () => {
          set({
            profile: { ...DEFAULT_PROFILE },
            subjects: [],
            syllabusUnits: [],
            assessments: [],
            attendance: [],
            studySessions: [],
            revisionItems: [],
            notes: [],
            tasks: [],
            timetableSlots: [],
            calendarEvents: [],
            assignments: [],
            exams: [],
            pyqs: [],
            erPapers: [],
            currentView: 'dashboard' as const,
            selectedSubjectId: null,
            previousView: null,
            focusActive: false,
            focusSubjectId: null,
            focusTopicId: null,
            focusStartTime: null,
            focusElapsed: 0,
          });
          localStorage.removeItem('delulu-v4-data');
        },
      };
    },
    {
      name: 'delulu-v4-data',
      storage: createJSONStorage(() => localStorage),
      // Only persist data, not navigation or transient state
      partialize: (state) => ({
        profile: state.profile,
        subjects: state.subjects,
        syllabusUnits: state.syllabusUnits,
        assessments: state.assessments,
        attendance: state.attendance,
        studySessions: state.studySessions,
        revisionItems: state.revisionItems,
        notes: state.notes,
        tasks: state.tasks,
        timetableSlots: state.timetableSlots,
        calendarEvents: state.calendarEvents,
        assignments: state.assignments,
        exams: state.exams,
        pyqs: state.pyqs,
        erPapers: state.erPapers,
      }),
      // Migrate: inject study sessions if existing data has none
      migrate: (persisted) => {
        if (persisted.studySessions && persisted.studySessions.length === 0) {
          const seed = seedDemoData();
          persisted.studySessions = seed.studySessions;
        }
        return persisted;
      },
    }
  )
);

// ═════════════════════════════════════════════════════════════════════
// SM-2 Revision Review Helper
// ═════════════════════════════════════════════════════════════════════
/**
 * Review a revision item using the SM-2 algorithm.
 * @param store - the zustand store
 * @param itemId - the revision item id
 * @param quality - quality of recall (0-5). >= 3 means pass.
 * @returns void (mutates the store)
 */
export function reviewRevisionItem(
  store: ReturnType<typeof useStore>,
  itemId: string,
  quality: number
) {
  const item = store.getState().revisionItems.find((r) => r.id === itemId);
  if (!item) return;

  const q = Math.max(0, Math.min(5, quality));
  let { easeFactor, interval, repetitions } = item;

  if (q >= 3) {
    // Good response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    easeFactor =
      Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  } else {
    // Bad response - reset
    repetitions = 0;
    interval = 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  const nextReview = nextReviewDate.toISOString().split('T')[0];

  store.getState().updateRevisionItem(itemId, {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReview: todayStr(),
  });
}

// ═════════════════════════════════════════════════════════════════════
// Computed Helper Methods
// ═════════════════════════════════════════════════════════════════════

/** Syllabus completion % for a subject */
export function getSubjectProgress(
  state: Pick<AppState, 'syllabusUnits'>,
  subjectId: string
): number {
  const units = state.syllabusUnits.filter((u) => u.subjectId === subjectId);
  const allTopics = units.flatMap((u) => u.topics);
  if (allTopics.length === 0) return 0;
  const completed = allTopics.filter((t) => t.completed).length;
  return Math.round((completed / allTopics.length) * 100);
}

/** Attendance stats for a subject */
export function getSubjectAttendance(
  state: Pick<AppState, 'attendance'>,
  subjectId: string
): { present: number; total: number; percentage: number } {
  const records = state.attendance.filter((a) => a.subjectId === subjectId);
  const total = records.reduce((sum, r) => sum + r.totalClasses, 0);
  const present = records.filter((r) => r.present).reduce((sum, r) => sum + r.totalClasses, 0);
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  return { present, total, percentage };
}

/** Marks summary for a subject */
export function getSubjectMarks(
  state: Pick<AppState, 'assessments'>,
  subjectId: string
): { obtained: number; max: number; percentage: number } {
  const assessments = state.assessments.filter((a) => a.subjectId === subjectId);
  const obtained = assessments.reduce((sum, a) => sum + a.obtainedMarks, 0);
  const max = assessments.reduce((sum, a) => sum + a.maxMarks, 0);
  const percentage = max > 0 ? Math.round((obtained / max) * 100) : 0;
  return { obtained, max, percentage };
}

/** Projected grade for a subject based on current marks */
export function getSubjectGrade(
  state: Pick<AppState, 'assessments'>,
  subjectId: string
): string {
  const { percentage } = getSubjectMarks(state, subjectId);
  return GRADE_FROM_PERCENTAGE(percentage);
}

/** Current semester SGPA */
export function calculateSGPA(state: Pick<AppState, 'subjects' | 'assessments'>): number {
  const activeSubjects = state.subjects.filter((s) => !s.archived);
  if (activeSubjects.length === 0) return 0;

  let totalWeightedPoints = 0;
  let totalCredits = 0;

  for (const subject of activeSubjects) {
    const grade = getSubjectGrade(state, subject.id);
    const gradePoint = GRADE_POINTS[grade] ?? 0;
    totalWeightedPoints += gradePoint * subject.credits;
    totalCredits += subject.credits;
  }

  return totalCredits > 0
    ? Math.round((totalWeightedPoints / totalCredits) * 100) / 100
    : 0;
}

/** Overall CGPA (currently same as SGPA for single semester data) */
export function calculateCGPA(state: Pick<AppState, 'subjects' | 'assessments'>): number {
  return calculateSGPA(state);
}

/** Revision items due today or earlier */
export function getDueRevisionItems(
  state: Pick<AppState, 'revisionItems'>
): RevisionItem[] {
  const today = todayStr();
  return state.revisionItems.filter((r) => r.nextReview <= today);
}

/** Tasks due today */
export function getTodayTasks(
  state: Pick<AppState, 'tasks'>
): Task[] {
  const today = todayStr();
  return state.tasks.filter(
    (t) => t.dueDate === today && !t.completed
  );
}

/** Overdue tasks (past due, not completed) */
export function getOverdueTasks(
  state: Pick<AppState, 'tasks'>
): Task[] {
  const today = todayStr();
  return state.tasks.filter(
    (t) => t.dueDate && t.dueDate < today && !t.completed
  );
}

/** Health signal for a subject */
export function getSubjectSignal(
  state: AppState,
  subjectId: string
): SignalStatus {
  const att = getSubjectAttendance(state, subjectId);
  const progress = getSubjectProgress(state, subjectId);
  const marks = getSubjectMarks(state, subjectId);
  const dueRevisions = getDueRevisionItems(state).filter(
    (r) => r.subjectId === subjectId
  );

  // No data at all
  if (att.total === 0 && marks.max === 0 && progress === 0) {
    return 'nodata';
  }

  // Critical: attendance below threshold or very low marks
  if (
    att.total > 0 && att.percentage < 60
  ) {
    return 'critical';
  }

  if (
    marks.max > 0 && marks.percentage < 40
  ) {
    return 'critical';
  }

  // Attention: attendance near threshold, many overdue revisions, or low marks
  if (
    (att.total > 0 && att.percentage < state.profile.attendanceThreshold) ||
    dueRevisions.length >= 3 ||
    (marks.max > 0 && marks.percentage < 55)
  ) {
    return 'attention';
  }

  // Improving: some progress but not great
  if (
    progress > 0 && progress < 50 &&
    (marks.max === 0 || marks.percentage < 70)
  ) {
    return 'improving';
  }

  // Healthy: good attendance, decent progress
  if (
    (att.total === 0 || att.percentage >= state.profile.attendanceThreshold) &&
    progress >= 50
  ) {
    return 'healthy';
  }

  return 'improving';
}

/** Overall semester health score 0-100 */
export function getSemesterHealth(state: AppState): number {
  const activeSubjects = state.subjects.filter((s) => !s.archived);
  if (activeSubjects.length === 0) return 0;

  let totalScore = 0;
  let maxScore = 0;

  for (const subject of activeSubjects) {
    // Attendance score (30 points max)
    const att = getSubjectAttendance(state, subject.id);
    const attScore = att.total > 0 ? Math.min(30, (att.percentage / 100) * 30) : 10;

    // Marks score (30 points max)
    const marks = getSubjectMarks(state, subject.id);
    const marksScore = marks.max > 0 ? (marks.percentage / 100) * 30 : 10;

    // Syllabus progress (20 points max)
    const progress = getSubjectProgress(state, subject.id);
    const progressScore = (progress / 100) * 20;

    // Revision health (20 points max)
    const subjectRevisions = state.revisionItems.filter(
      (r) => r.subjectId === subject.id
    );
    const overdueRevisions = subjectRevisions.filter(
      (r) => r.nextReview <= todayStr()
    ).length;
    const revisionScore = subjectRevisions.length > 0
      ? Math.max(0, 20 - overdueRevisions * 5)
      : 10;

    totalScore += attScore + marksScore + progressScore + revisionScore;
    maxScore += 100;
  }

  return Math.round((totalScore / maxScore) * 100);
}

/** Total study time this week (in seconds) */
export function getStudyTimeThisWeek(
  state: Pick<AppState, 'studySessions'>
): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
   // Start of week: Monday (day 1) or Sunday (day 0) — we use Sunday as start
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const startStr = startOfWeek.toISOString().split('T')[0];

  return state.studySessions
    .filter((s) => s.date >= startStr)
    .reduce((sum, s) => sum + s.duration, 0);
}

/** Current consecutive day study streak (days with >= 1 session) */
export function getStudyStreak(
  state: Pick<AppState, 'studySessions'>
): number {
  const today = new Date();
  const sessionsByDate = new Map<string, number>();
  for (const s of state.studySessions) {
    sessionsByDate.set(s.date, (sessionsByDate.get(s.date) || 0) + 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if ((sessionsByDate.get(dateStr) || 0) >= 1) {
      streak++;
    } else {
      // If today has no sessions, don't count it as breaking the streak
      // (streak counts backwards from most recent study day)
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

/** Total study time today (in seconds) */
export function getStudyTimeToday(
  state: Pick<AppState, 'studySessions'>
): number {
  const today = todayStr();
  return state.studySessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.duration, 0);
}

/** Study items for today's focus recommendations */
export function getTodayFocus(state: AppState): {
  subjectId: string;
  subjectName: string;
  topicName: string;
  topicId: string;
  reason: string;
}[] {
  const recommendations: {
    subjectId: string;
    subjectName: string;
    topicName: string;
    topicId: string;
    reason: string;
  }[] = [];

  const today = todayStr();

  // 1. Overdue revision items
  for (const item of state.revisionItems) {
    if (item.nextReview < today) {
      const subject = state.subjects.find((s) => s.id === item.subjectId);
      if (subject) {
        recommendations.push({
          subjectId: item.subjectId,
          subjectName: subject.name,
          topicName: item.topicName,
          topicId: item.topicId,
          reason: 'Overdue revision',
        });
      }
    }
  }

  // 2. Due revision items (today)
  for (const item of state.revisionItems) {
    if (item.nextReview === today) {
      const subject = state.subjects.find((s) => s.id === item.subjectId);
      if (subject) {
        recommendations.push({
          subjectId: item.subjectId,
          subjectName: subject.name,
          topicName: item.topicName,
          topicId: item.topicId,
          reason: 'Due for revision today',
        });
      }
    }
  }

  // 3. Incomplete syllabus topics for subjects with attention/critical signal
  for (const unit of state.syllabusUnits) {
    if (state.subjects.find((s) => s.id === unit.subjectId)?.archived) continue;
    const signal = getSubjectSignal(state, unit.subjectId);
    if (signal === 'attention' || signal === 'critical') {
      for (const topic of unit.topics) {
        if (!topic.completed) {
          const subject = state.subjects.find((s) => s.id === unit.subjectId);
          if (subject) {
            recommendations.push({
              subjectId: unit.subjectId,
              subjectName: subject.name,
              topicName: topic.name,
              topicId: topic.id,
              reason: `${signal === 'critical' ? 'Critical' : 'Needs attention'} — incomplete topic`,
            });
          }
        }
      }
    }
  }

  // 4. Upcoming tasks due today
  const todayTasks = getTodayTasks(state);
  for (const task of todayTasks) {
    if (task.subjectId) {
      const subject = state.subjects.find((s) => s.id === task.subjectId);
      if (subject) {
        recommendations.push({
          subjectId: task.subjectId,
          subjectName: subject.name,
          topicName: task.title,
          topicId: '',
          reason: 'Task due today',
        });
      }
    }
  }

  return recommendations;
}
