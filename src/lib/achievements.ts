'use client';

// ─── Achievement System ────────────────────────────────────────

export interface AchievementState {
  totalSessions: number;
  totalStudyMinutes: number;
  longestSessionMinutes: number;
  streak: number;
  avgAttendance: number;
  subjects: { id: string; name: string; syllabusCompletion: number }[];
  cgpa: number;
  assessmentScores: number[]; // percentages
  notesCount: number;
  completedTasks: number;
  perfectWeekDays: number; // consecutive days with 100% attendance where classes occurred
  hasAnyAttendance: boolean;
  nightSessions: number; // study sessions started after 10 PM (22:00)
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'study' | 'attendance' | 'academic' | 'streak' | 'social';
  xpReward: number;
  condition: (state: AchievementState) => boolean;
}

// ─── Achievement Definitions ───────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── Study ──
  {
    id: 'first_session',
    name: 'First Session',
    description: 'Complete your first study session',
    icon: '🎯',
    category: 'study',
    xpReward: 25,
    condition: (s) => s.totalSessions >= 1,
  },
  {
    id: 'ten_sessions',
    name: '10 Sessions',
    description: 'Complete 10 study sessions',
    icon: '📝',
    category: 'study',
    xpReward: 75,
    condition: (s) => s.totalSessions >= 10,
  },
  {
    id: 'study_warrior',
    name: 'Study Warrior',
    description: 'Complete 50 study sessions',
    icon: '⚔️',
    category: 'study',
    xpReward: 200,
    condition: (s) => s.totalSessions >= 50,
  },
  {
    id: 'hundred_hour_club',
    name: '100 Hour Club',
    description: 'Study for 100 hours total',
    icon: '⏰',
    category: 'study',
    xpReward: 300,
    condition: (s) => s.totalStudyMinutes >= 6000,
  },
  {
    id: 'deep_focus',
    name: 'Deep Focus',
    description: 'Complete a single session over 60 minutes',
    icon: '🧠',
    category: 'study',
    xpReward: 100,
    condition: (s) => s.longestSessionMinutes > 60,
  },

  // ── Attendance ──
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: '100% attendance for 7+ consecutive days',
    icon: '✅',
    category: 'attendance',
    xpReward: 150,
    condition: (s) => s.perfectWeekDays >= 7,
  },
  {
    id: 'attendance_champion',
    name: 'Attendance Champion',
    description: 'Maintain 95% or higher overall attendance',
    icon: '🏅',
    category: 'attendance',
    xpReward: 200,
    condition: (s) => s.hasAnyAttendance && s.avgAttendance >= 95,
  },

  // ── Academic ──
  {
    id: 'straight_as',
    name: "Straight A's",
    description: 'Score 90%+ on all assessments',
    icon: '🌟',
    category: 'academic',
    xpReward: 250,
    condition: (s) => s.assessmentScores.length > 0 && s.assessmentScores.every((pct) => pct >= 90),
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Achieve a CGPA of 9.0 or above',
    icon: '🎓',
    category: 'academic',
    xpReward: 300,
    condition: (s) => s.cgpa >= 9.0,
  },
  {
    id: 'subject_master',
    name: 'Subject Master',
    description: 'Complete 100% syllabus for any subject',
    icon: '📖',
    category: 'academic',
    xpReward: 200,
    condition: (s) => s.subjects.some((sub) => sub.syllabusCompletion >= 100),
  },

  // ── Streak ──
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    category: 'streak',
    xpReward: 150,
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'monthly_master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day study streak',
    icon: '💪',
    category: 'streak',
    xpReward: 400,
    condition: (s) => s.streak >= 30,
  },

  // ── Notes ──
  {
    id: 'note_taker',
    name: 'Note Taker',
    description: 'Create 5 notes',
    icon: '✏️',
    category: 'social',
    xpReward: 50,
    condition: (s) => s.notesCount >= 5,
  },
  {
    id: 'prolific_writer',
    name: 'Prolific Writer',
    description: 'Create 20 notes',
    icon: '📝',
    category: 'social',
    xpReward: 150,
    condition: (s) => s.notesCount >= 20,
  },

  // ── Tasks ──
  {
    id: 'task_master',
    name: 'Task Master',
    description: 'Complete 10 tasks',
    icon: '✅',
    category: 'social',
    xpReward: 100,
    condition: (s) => s.completedTasks >= 10,
  },
  {
    id: 'five_sessions',
    name: 'Getting Started',
    description: 'Complete 5 study sessions',
    icon: '🚀',
    category: 'study',
    xpReward: 50,
    condition: (s) => s.totalSessions >= 5,
  },

  // ── Extended Achievements ──
  {
    id: 'perfect_attendance_week',
    name: 'Perfect Week',
    description: 'Attended every class this week',
    icon: '📅',
    category: 'attendance',
    xpReward: 175,
    condition: (s) => s.hasAnyAttendance && s.perfectWeekDays >= 7,
  },
  {
    id: 'syllabus_complete',
    name: 'Syllabus Master',
    description: 'All topics completed across all subjects',
    icon: '🏆',
    category: 'academic',
    xpReward: 350,
    condition: (s) => s.subjects.length > 0 && s.subjects.every((sub) => sub.syllabusCompletion >= 100),
  },
  {
    id: 'centurion',
    name: '100-Hour Club',
    description: 'Over 100 hours of focused study',
    icon: '💎',
    category: 'study',
    xpReward: 400,
    condition: (s) => s.totalStudyMinutes >= 6000,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: '10 late-night study sessions',
    icon: '🦉',
    category: 'study',
    xpReward: 200,
    condition: (s) => s.nightSessions >= 10,
  },
];

// ─── Category Metadata ─────────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; color: string; darkColor: string }> = {
  study: { label: 'Study', color: 'text-blue-600', darkColor: 'dark:text-blue-400' },
  attendance: { label: 'Attendance', color: 'text-emerald-600', darkColor: 'dark:text-emerald-400' },
  academic: { label: 'Academic', color: 'text-purple-600', darkColor: 'dark:text-purple-400' },
  streak: { label: 'Streak', color: 'text-orange-600', darkColor: 'dark:text-orange-400' },
  social: { label: 'Productivity', color: 'text-pink-600', darkColor: 'dark:text-pink-400' },
};

// ─── Check Achievements ────────────────────────────────────────

/** Returns all currently unlocked achievements */
export function checkAchievements(state: AchievementState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.condition(state));
}

// ─── XP & Level ────────────────────────────────────────────────

/** Calculate total XP from unlocked achievement IDs */
export function getTotalXP(unlockedIds: string[]): number {
  return unlockedIds.reduce((sum, id) => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === id);
    return sum + (achievement?.xpReward ?? 0);
  }, 0);
}

/** Calculate level from total XP. Level N requires N*100 cumulative XP. */
export function getLevel(xp: number): {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  progress: number;
} {
  // Level N requires sum(1..N) * 100 = N*(N+1)/2 * 100 XP total
  // Inverse: find N such that N*(N+1)/2 * 100 <= xp
  let level = 0;
  let cumulativeXP = 0;

  while (true) {
    const nextLevelXP = (level + 1) * 100; // XP needed for next level
    if (cumulativeXP + nextLevelXP > xp) break;
    cumulativeXP += nextLevelXP;
    level++;
    // Safety cap
    if (level > 100) break;
  }

  const currentXP = xp - cumulativeXP;
  const nextLevelXP = (level + 1) * 100;
  const progress = nextLevelXP > 0 ? Math.min(1, currentXP / nextLevelXP) : 0;

  return { level, currentXP, nextLevelXP, progress };
}

/** Build AchievementState from store data */
export function buildAchievementState(data: {
  studySessions: { duration: number; date: string; startTime?: string }[];
  attendance: { present: boolean; totalClasses: number; date: string }[];
  syllabusUnits: { subjectId: string; topics: { completed: boolean }[] }[];
  subjects: { id: string; name: string }[];
  assessments: { maxMarks: number; obtainedMarks: number }[];
  notes: { id: string }[];
  tasks: { completed: boolean }[];
  streak: number;
  cgpa: number;
}): AchievementState {
  const totalSessions = data.studySessions.length;
  const totalStudyMinutes = data.studySessions.reduce((sum, s) => sum + s.duration / 60, 0);
  const longestSessionMinutes = data.studySessions.reduce((max, s) => Math.max(max, s.duration / 60), 0);

  // Attendance average
  let totalPresent = 0;
  let totalPossible = 0;
  for (const rec of data.attendance) {
    totalPresent += rec.present ? rec.totalClasses : 0;
    totalPossible += rec.totalClasses;
  }
  const avgAttendance = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

  // Perfect week: check for 7+ consecutive days with 100% attendance
  const attendanceByDate = new Map<string, { present: number; total: number }>();
  for (const rec of data.attendance) {
    const existing = attendanceByDate.get(rec.date) || { present: 0, total: 0 };
    if (rec.present) existing.present += rec.totalClasses;
    existing.total += rec.totalClasses;
    attendanceByDate.set(rec.date, existing);
  }

  const sortedDates = Array.from(attendanceByDate.keys())
    .filter((d) => attendanceByDate.get(d)!.total > 0)
    .sort();

  let maxPerfectDays = 0;
  let currentPerfectDays = 0;
  for (const date of sortedDates) {
    const rec = attendanceByDate.get(date)!;
    if (rec.present === rec.total) {
      currentPerfectDays++;
      maxPerfectDays = Math.max(maxPerfectDays, currentPerfectDays);
    } else {
      currentPerfectDays = 0;
    }
  }

  // Subject syllabus completion
  const subjectCompletion = data.subjects.map((sub) => {
    const topics = data.syllabusUnits
      .filter((u) => u.subjectId === sub.id)
      .flatMap((u) => u.topics);
    const completed = topics.filter((t) => t.completed).length;
    const total = topics.length;
    return {
      id: sub.id,
      name: sub.name,
      syllabusCompletion: total > 0 ? (completed / total) * 100 : 0,
    };
  });

  // Assessment scores
  const assessmentScores = data.assessments.map((a) =>
    a.maxMarks > 0 ? (a.obtainedMarks / a.maxMarks) * 100 : 0,
  );

  // Night sessions: sessions started after 10 PM (22:00)
  const nightSessions = data.studySessions.filter((s) => {
    if (!s.startTime) return false;
    try {
      const hour = new Date(s.startTime).getHours();
      return hour >= 22 || hour === 0;
    } catch {
      return false;
    }
  }).length;

  return {
    totalSessions,
    totalStudyMinutes,
    longestSessionMinutes,
    streak: data.streak,
    avgAttendance,
    subjects: subjectCompletion,
    cgpa: data.cgpa,
    assessmentScores,
    notesCount: data.notes.length,
    completedTasks: data.tasks.filter((t) => t.completed).length,
    perfectWeekDays: maxPerfectDays,
    hasAnyAttendance: data.attendance.length > 0,
    nightSessions,
  };
}
