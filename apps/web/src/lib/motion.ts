import type { Transition, Variants } from "framer-motion";

// Motion presets for Framer Motion. Short, calm, never bouncy on clinical
// content. <MotionConfig reducedMotion="user"> in app/Providers turns the
// transform parts off for people who ask for reduced motion; opacity fades
// remain, which WCAG 2.3.3 allows.

/** cubic-bezier(0.22, 1, 0.36, 1), the same curve as `ease-editorial` in tokens.css. */
export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export const DURATION = { fast: 0.15, base: 0.32, slow: 0.48 } as const;

export const transition: Transition = { duration: DURATION.base, ease: EASE_EDITORIAL };

/** Fade and lift by 8px, starting after `delay` seconds: section and card entrances. */
export function riseAfter(delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_EDITORIAL, delay } },
  };
}

export const rise: Variants = riseAfter();

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition },
};

/** Parent variant that staggers its children's `rise`/`fade`. */
export function stagger(step = 0.06, delay = 0): Variants {
  return { hidden: {}, visible: { transition: { staggerChildren: step, delayChildren: delay } } };
}

/** Masked line reveal for display headings (see components/ui/text-reveal). */
export const lineReveal: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 0.7, ease: EASE_EDITORIAL } },
};
