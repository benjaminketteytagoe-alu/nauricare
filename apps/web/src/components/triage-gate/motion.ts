import type { Transition, Variants } from "framer-motion";

// Shared organic spring for every tactile control on the triage gate.
export const SPRING: Transition = { type: "spring", stiffness: 300, damping: 20 };

export const tactile = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: SPRING,
} as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
