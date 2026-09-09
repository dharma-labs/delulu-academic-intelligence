/**
 * Load DU data files from /data directory.
 * These are static JSON files bundled with the app.
 * In production, these would be fetched from a CDN or API.
 */
import type { ReactNode } from 'react';

export interface DUCollege {
  name: string;
  campus: string;
  website: string | null;
}

export interface DUCollegesData {
  sourceUrl: string;
  sourceDate: string;
  verified: boolean;
  note: string;
  colleges: DUCollege[];
}

export interface DUSourceManifest {
  version: number;
  lastUpdated: string;
  sources: Record<string, {
    file: string;
    sourceUrl: string | null;
    sourceDate: string | null;
    verified: boolean;
    recordCount: number;
    note?: string;
  }>;
}


export interface DUPaper {
  name: string;
  upcCode: string | null;
  credits: number;
  courseType: string; // DSC/DSE/GE/AECC/SEC/VC/OE
  internalMarksMax: number;
  endSemMarksMax: number;
  verified: boolean;
  verifiedNote?: string;
}

export interface DUSemester {
  semester: number;
  papers: DUPaper[];
}

export interface DUProgramme {
  name: string;
  code: string;
  department: string;
  faculty: string;
  durationYears: number;
  totalCredits: number;
  sourceUrl: string;
  verified: boolean;
  semesters: DUSemester[];
}

export interface DUCoursesData {
  sourceUrl: string;
  sourceDate: string;
  verified: boolean;
  note: string;
  programmes: DUProgramme[];
}


export interface DUVacation {
  start: string;
  end: string;
}

export interface DUSemesterDates {
  appliesTo: string;
  classesBegin: string;
  autumnVacation?: DUVacation;
  midSemesterVacation?: DUVacation;
  winterVacation?: DUVacation;
  summerVacation?: DUVacation;
  classesResumeAfterAutumnVacation?: string;
  classesResumeAfterMidSemVacation?: string;
  dispersalPrepLeavePracticalExamBegin: string;
  theoryExaminationsBegin: string;
}

export interface DUAcaCalData {
  academicYear: string;
  sourceUrl: string;
  sourceDate: string;
  verified: boolean;
  note: string;
  oddSemester: DUSemesterDates;
  evenSemester: DUSemesterDates;
  resultDeclarationWindows: { verified: boolean; note: string };
  reEvaluationDeadlines: { verified: boolean; note: string };
}

// Cache loaded data
let _collegesCache: DUCollegesData | null = null;
let _manifestCache: DUSourceManifest | null = null;
let _coursesCache: DUCoursesData | null = null;
let _acaCalCache: DUAcaCalData | null = null;

export async function loadColleges(): Promise<DUCollegesData> {
  if (_collegesCache) return _collegesCache;
  try {
    const res = await fetch('/data/colleges.json');
    _collegesCache = await res.json();
    return _collegesCache!;
  } catch {
    return { sourceUrl: '', sourceDate: '', verified: false, note: 'Failed to load', colleges: [] };
  }
}



export async function loadAcademicCalendar(): Promise<DUAcaCalData | null> {
  if (_acaCalCache) return _acaCalCache;
  try {
    const res = await fetch('/data/academic-calendar.json');
    _acaCalCache = await res.json();
    return _acaCalCache;
  } catch {
    return null;
  }
}

export async function loadCourses(): Promise<DUCoursesData> {
  if (_coursesCache) return _coursesCache;
  try {
    const res = await fetch('/data/courses.json');
    _coursesCache = await res.json();
    return _coursesCache!;
  } catch {
    return { sourceUrl: '', sourceDate: '', verified: false, note: 'Failed to load', programmes: [] };
  }
}

/**
 * Find a matching paper by name (fuzzy) in a programme's semester.
 * Used for UPC auto-populate when user adds a subject.
 */
export function findMatchingPaper(
  programmes: DUProgramme[],
  programmeName: string,
  subjectName: string,
  semester: number
): DUPaper | null {
  const prog = programmes.find(p => p.name === programmeName);
  if (!prog) return null;
  const sem = prog.semesters.find(s => s.semester === semester);
  if (!sem) return null;
  // Exact match first
  const exact = sem.papers.find(p => p.name.toLowerCase() === subjectName.toLowerCase());
  if (exact) return exact;
  // Fuzzy: contains
  const fuzzy = sem.papers.find(p => 
    p.name.toLowerCase().includes(subjectName.toLowerCase()) || 
    subjectName.toLowerCase().includes(p.name.toLowerCase())
  );
  return fuzzy || null;
}

export async function loadManifest(): Promise<DUSourceManifest> {
  if (_manifestCache) return _manifestCache;
  try {
    const res = await fetch('/data/du-source-manifest.json');
    _manifestCache = await res.json();
    return _manifestCache!;
  } catch {
    return { version: 0, lastUpdated: '', sources: {} };
  }
}

/**
 * "Data as of" badge component — shows source date for fetched DU data.
 * Displays a refresh prompt if data is >10 months old.
 */
export function dataAsOfBadge(sourceDate: string | null, verified: boolean): { text: string; stale: boolean } {
  if (!sourceDate) return { text: 'source date unknown', stale: true };
  const date = new Date(sourceDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  const stale = monthsDiff > 10;
  return {
    text: `data as of ${sourceDate}${!verified ? ' (unverified)' : ''}`,
    stale,
  };
}
