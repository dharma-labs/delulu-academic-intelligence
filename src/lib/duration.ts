/** Canonical duration formatting (was duplicated with drifting behaviour in 3 files).
 *  `precise` keeps seconds for live timers; everything else shows minutes/hours. */
export function formatDuration(totalSeconds: number, opts: { precise?: boolean } = {}): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return opts.precise && s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}
