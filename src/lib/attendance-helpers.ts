import type { AttendanceRecord } from './types';

export type AttendanceState = 'comfortable' | 'getting_tight' | 'at_risk';

export type ThreeStateAttendance = 'on-track' | 'below-threshold' | 'needs-attention';

export interface AttendanceDisplay {
  label: string;
  colorClass: string;
  bgClass: string;
  variant: ThreeStateAttendance;
}

export function classifyAttendance(percentage: number, threshold: number = 66.67): AttendanceState {
  if (percentage >= threshold + 10) return 'comfortable';
  if (percentage >= threshold) return 'getting_tight';
  return 'at_risk';
}

export function classesCanBeMissed(present: number, total: number, threshold: number = 66.67): number {
  if (total === 0) return 0;
  const maxTotal = present / (threshold / 100);
  return Math.max(0, Math.floor(maxTotal - total));
}

/** The ONE definition of overall attendance percentage.
 *  Pooled — weighted by classes held. The mean-of-per-subject-percentages variant
 *  used on some surfaces produced a different number for the same data. */
export function pooledAttendancePercent(records: AttendanceRecord[]): number {
  const total = records.reduce((s, r) => s + r.totalClasses, 0);
  const present = records.filter((r) => r.present).reduce((s, r) => s + r.totalClasses, 0);
  return total === 0 ? 0 : Math.round((present / total) * 100);
}

export const ATTENDANCE_STATE_CONFIG: Record<AttendanceState, { label: string; className: string }> = {
  comfortable: { label: 'Comfortable buffer', className: 'text-[var(--delulu-success)]' },
  getting_tight: { label: 'Getting tight', className: 'text-[var(--delulu-warning)]' },
  at_risk: { label: 'Below 66.67%', className: 'text-[var(--delulu-danger)]' },
};

// -- Three-state attendance display (behavioral: no red, no alarm language) --
// Bands come from classifyAttendance so every surface agrees on what "at risk" means.
export function getAttendanceState(percentage: number, threshold: number = 66.67): AttendanceDisplay {
  const state = classifyAttendance(percentage, threshold);
  if (state === 'comfortable') {
    return { label: 'On Track', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50', variant: 'on-track' };
  }
  if (state === 'getting_tight') {
    return { label: 'Below Threshold', colorClass: 'text-amber-600', bgClass: 'bg-amber-50', variant: 'below-threshold' };
  }
  return { label: 'Needs Attention', colorClass: 'text-slate-600', bgClass: 'bg-slate-50', variant: 'needs-attention' };
}
