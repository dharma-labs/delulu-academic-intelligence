/** Canonical date helpers.
 *
 *  Rule: date-only values are LOCAL wall-clock "YYYY-MM-DD" strings.
 *  The old `new Date().toISOString().split('T')[0]` pattern returns the UTC date,
 *  which is the previous day between 00:00 and 05:30 in IST — every site that
 *  compared, defaulted or filtered "today" was wrong for those hours.
 */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return ymd(new Date());
}

/** Today shifted by N days (local). */
export function ymdPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
}
