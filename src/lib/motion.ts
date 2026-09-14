import type { Variants } from 'framer-motion';

/**
 * Delulu 5.x centralized motion system (spec §26).
 * Named, reusable motion patterns with calm timing/easing.
 * Every consumer should respect reduced-motion preferences (see useReducedMotion).
 */

export const motionPageEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const motionFadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const motionCardExpand: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } },
};

export const motionCardCollapse: Variants = {
  hidden: { opacity: 1, scale: 1 },
  show: { opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const motionSheetOpen: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

export const motionSheetClose: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 0, y: 24, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const motionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
} as Variants;

/**
 * Returns motion props that collapse to static when the user prefers
 * reduced motion. Pair with framer-motion's `useReducedMotion` hook.
 */
export function reducedMotionVariants(variants: Variants, reduced: boolean | null): Variants {
  if (!reduced) return variants;
  const strip = (v: Variants): Variants => {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      if (val && typeof val === 'object') {
        const { transition, ...rest } = val as Record<string, unknown>;
        out[k] = rest;
      } else out[k] = val;
    }
    return out as Variants;
  };
  return strip(variants);
}
