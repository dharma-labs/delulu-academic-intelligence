/**
 * Canonical "marks still needed in the end-semester exam" projection.
 * Previously the IA/ESE split component and the subject page each had their own
 * formula (linear vs a fixed 40/60 weighting), so the same subject could show two
 * different answers.
 */
export function eseMarksNeeded(
  currentIa: number,
  iaMax: number,
  eseMax: number,
  targetPercent: number,
): number {
  const totalMax = iaMax + eseMax;
  if (totalMax <= 0) return 0;
  return Math.max(0, Math.ceil((targetPercent / 100) * totalMax - currentIa));
}
