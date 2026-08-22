'use client';

import type { Assessment, AttendanceRecord, Subject, TimetableSlot } from './types';

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
