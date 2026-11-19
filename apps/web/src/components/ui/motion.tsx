"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { lineReveal, rise, riseAfter, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Motion blocks. Reduced motion is handled globally by <MotionConfig
// reducedMotion="user"> (transforms are skipped) and the CSS rule in
// tokens.css. Text is always in the DOM, so screen readers and search
// engines read it whether or not it animates.

/**
 * Masked line reveal for display headings: each line slides up from behind
 * a clip. Modelled on Pixel Perfect's GSAP "Text reveal" (MIT, see
 * THIRD_PARTY_NOTICES.md) but written from scratch on Framer Motion.
 */
export function TextReveal({
  lines,
  as: Tag = "h1",
  className,
  lineClassName,
  delay = 0,
}: {
  lines: ReactNode[];
  as?: "h1" | "h2" | "p";
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  const MotionTag = motion[Tag];
  return (
    <MotionTag className={className} initial="hidden" animate="visible" variants={stagger(0.09, delay)}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span className={cn("block", lineClassName)} variants={lineReveal}>
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/**
 * Fade-and-rise on first scroll into view. Renders one <div> that takes
 * `className`, so it can be the layout element itself (flex, grid, card).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={delay ? riseAfter(delay) : rise}
    >
      {children}
    </motion.div>
  );
}

/**
 * Confirmation mark: a check that draws in over two expanding rings, played
 * once (never looping). Adapted from Pixel Perfect's "Success ripple
 * animation" (MIT, see THIRD_PARTY_NOTICES.md).
 */
export function SuccessMark({ label = "Done", className }: { label?: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("relative inline-flex size-16 items-center justify-center", className)}
    >
      {[0, 0.35].map((d) => (
        <motion.span
          key={d}
          aria-hidden
          className="absolute inset-0 rounded-full bg-success/20"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ delay: d, duration: 1.4, ease: "easeOut" }}
        />
      ))}
      <motion.svg
        viewBox="0 0 52 52"
        className="relative size-14 text-success"
        aria-hidden
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 160 }}
      >
        <circle cx="26" cy="26" r="24" className="fill-current" />
        <motion.path
          d="M16 27 L23 34 L36 19"
          fill="none"
          className="stroke-surface"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
        />
      </motion.svg>
    </span>
  );
}
