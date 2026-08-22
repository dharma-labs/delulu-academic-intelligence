'use client';

import type { Assessment, AttendanceRecord, Subject, StudySession, TimetableSlot } from './types';

// ─── CSV Helper ───────────────────────────────────────────────────

/** Escape a single CSV field – wraps in quotes if it contains commas, quotes, or newlines. */
function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string from headers and rows, then trigger a download. */
function downloadCSV(headers: string[], rows: string[][], filename: string): void {
  const csvHeader = headers.map(escapeField).join(',');
  const csvBody = rows
    .map((row) => row.map(escapeField).join(','))
    .join('\n');
  const csvContent = `${csvHeader}\n${csvBody}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Return today's date as YYYY-MM-DD for file naming. */
function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Marks Export ─────────────────────────────────────────────────

interface MarksExportRow {
  subject: string;
  assessmentType: string;
  assessmentName: string;
  date: string;
  obtainedMarks: number;
  maxMarks: number;
  percentage: number;
}

/** Category label map for CSV readability. */
const CATEGORY_LABELS: Record<Assessment['category'], string> = {
  ca_test: 'CA Test',
  assignment: 'Assignment',
  quiz: 'Quiz',
  practical: 'Practical',
  other: 'Other',
};

/** Export all assessments to a CSV file. */
export function exportMarksCSV(
  assessments: Assessment[],
  subjects: Subject[]
): void {
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  const headers = [
    'Subject',
    'Assessment Type',
    'Assessment Name',
    'Date',
    'Obtained Marks',
    'Max Marks',
    'Percentage',
  ];

  const rows: string[][] = assessments
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a): MarksExportRow => {
      const pct = a.maxMarks > 0 ? Math.round((a.obtainedMarks / a.maxMarks) * 100) : 0;
      return {
        subject: subjectMap.get(a.subjectId) || 'Unknown Subject',
        assessmentType: CATEGORY_LABELS[a.category],
        assessmentName: a.name,
        date: a.date,
        obtainedMarks: a.obtainedMarks,
        maxMarks: a.maxMarks,
        percentage: pct,
      };
    })
    .map((r) => [
      r.subject,
      r.assessmentType,
      r.assessmentName,
      r.date,
      String(r.obtainedMarks),
      String(r.maxMarks),
      `${r.percentage}%`,
    ]);

  downloadCSV(headers, rows, `marks_export_${todayStamp()}.csv`);
}

// ─── Attendance Export ─────────────────────────────────────────────

interface AttendanceExportRow {
  subject: string;
  date: string;
  status: string;
  classType: string;
  notes: string;
}

/** Export all attendance records to a CSV file.
 *  `classType` is looked up from timetable slots (day-of-week + subjectId match).
 *  Falls back to empty string if no match is found.
 */
export function exportAttendanceCSV(
  records: AttendanceRecord[],
  subjects: Subject[],
  timetableSlots?: TimetableSlot[]
): void {
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  // Build a lookup: `${subjectId}-${dayOfWeek}` → class type
  const timetableLookup = new Map<string, string>();
  if (timetableSlots) {
    for (const slot of timetableSlots) {
      timetableLookup.set(`${slot.subjectId}-${slot.day}`, slot.type);
    }
  }

  const headers = [
    'Subject',
    'Date',
    'Status',
    'Class Type',
    'Notes',
  ];

  const rows: string[][] = records
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r): AttendanceExportRow => {
      const dateObj = new Date(r.date + 'T00:00:00');
      const dayOfWeek = dateObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const classType =
        timetableLookup.get(`${r.subjectId}-${dayOfWeek}`) || '';

      return {
        subject: subjectMap.get(r.subjectId) || 'Unknown Subject',
        date: r.date,
        status: r.present ? 'Present' : 'Absent',
        classType,
        notes: '',
      };
    })
    .map((r) => [
      r.subject,
      r.date,
      r.status,
      r.classType,
      r.notes,
    ]);

  downloadCSV(headers, rows, `attendance_export_${todayStamp()}.csv`);
}

// ─── Analytics Export ─────────────────────────────────────────────

/** Export a comprehensive weekly study report as CSV with 3 sections. */
export function exportAnalyticsCSV(
  studySessions: StudySession[],
  subjects: Subject[],
): void {
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  // Determine this week's range (Mon–Sun)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekSessions = studySessions.filter((s) => {
    const d = new Date(s.date + 'T00:00:00');
    return d >= monday && d <= sunday;
  });

  // ── Section 1: Daily Summary (last 7 days) ──
  const dailyHeaders = [
    'Date',
    'Day',
    'Total Sessions',
    'Total Study Minutes',
    'Subjects Studied',
    'Avg Session Length',
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyRows: string[][] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    const daySessions = weekSessions.filter((s) => s.date === dateStr);
    const totalMin = Math.round(daySessions.reduce((a, s) => a + s.duration, 0) / 60);
    const subjectSet = new Set(daySessions.map((s) => s.subjectId));
    const avgLen = daySessions.length > 0 ? Math.round(totalMin / daySessions.length) : 0;

    dailyRows.push([
      dateStr,
      dayNames[i],
      String(daySessions.length),
      String(totalMin),
      String(subjectSet.size),
      `${avgLen}m`,
    ]);
  }

  // ── Section 2: Subject Breakdown ──
  const subjectHeaders = [
    'Subject',
    'Total Minutes This Week',
    'Sessions This Week',
    'Avg Session Length',
    '% of Total Time',
  ];

  const totalWeekMin = Math.round(weekSessions.reduce((a, s) => a + s.duration, 0) / 60);

  // Group by subject
  const subjectData = new Map<string, { minutes: number; sessions: number }>();
  for (const s of weekSessions) {
    const existing = subjectData.get(s.subjectId) || { minutes: 0, sessions: 0 };
    existing.minutes += Math.round(s.duration / 60);
    existing.sessions += 1;
    subjectData.set(s.subjectId, existing);
  }

  const subjectRows: string[][] = [...subjectData.entries()]
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .map(([subjectId, data]) => {
      const avgLen = data.sessions > 0 ? Math.round(data.minutes / data.sessions) : 0;
      const pctOfTotal = totalWeekMin > 0 ? Math.round((data.minutes / totalWeekMin) * 100) : 0;
      return [
        subjectMap.get(subjectId) || 'Unknown Subject',
        String(data.minutes),
        String(data.sessions),
        `${avgLen}m`,
        `${pctOfTotal}%`,
      ];
    });

  // ── Section 3: Session Log ──
  const sessionHeaders = [
    'Date',
    'Subject',
    'Duration (minutes)',
    'Topic',
  ];

  const sessionRows: string[][] = [...weekSessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => [
      s.date,
      subjectMap.get(s.subjectId) || 'Unknown Subject',
      String(Math.round(s.duration / 60)),
      s.topicName || '',
    ]);

  // ── Build combined CSV ──
  const allHeaders = dailyHeaders;
  const blankRow: string[] = [];
  const allRows = [
    ...dailyRows,
    blankRow,
    subjectHeaders,
    ...subjectRows,
    blankRow,
    sessionHeaders,
    ...sessionRows,
  ];

  const csvHeader = allHeaders.map(escapeField).join(',');
  const csvBody = allRows
    .map((row) => row.map(escapeField).join(','))
    .join('\n');
  const csvContent = `${csvHeader}\n${csvBody}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `analytics_report_${todayStamp()}.csv`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
