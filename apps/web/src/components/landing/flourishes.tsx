"use client";

import { motion } from "framer-motion";
import { Pause, Play, Sparkle } from "lucide-react";
import { useMemo, useState } from "react";
import { generatedAvatar } from "@/components/avatar/Avatar";
import { AVATAR_PRESETS, presetSrc } from "@/lib/avatars";
import { EASE_EDITORIAL } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Decorative building blocks for the landing page. Everything here is
// aria-hidden or has its own accessible name; ambient loops are CSS transforms
// (frozen by the reduced-motion rule in tokens.css) and the long-running ones
// get a pause button (WCAG 2.2.2).

/** The hand-drawn "Signature" avatars: women with afros, braids, locs, a hijab, a gele… */
export const SIGNATURE_FACES = AVATAR_PRESETS.map((p) => presetSrc(p.id));

/** DiceBear "Lorelei Neutral" faces, generated in the browser (nothing is sent anywhere). */
export function useGeneratedFaces(seeds: readonly string[]) {
  return useMemo(() => seeds.map((s) => generatedAvatar(s)), [seeds]);
}

const ORBIT_SEEDS = ["Aline", "Keza", "Ineza", "Teta", "Mutoni", "Uwase"] as const;
const STACK_SEEDS = ["Ishimwe", "Gaju"] as const;

/** Slow-drifting rose, lavender and apricot light behind a section. */
export function Bloom({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute -top-1/4 -left-1/6 size-[44rem] max-w-[120vw] animate-drift rounded-full bg-brand-line/45 blur-3xl will-change-transform" />
      <div className="absolute top-[8%] -right-1/5 size-[38rem] max-w-[110vw] animate-drift-slow rounded-full bg-lavender-line/55 blur-3xl will-change-transform" />
      <div className="absolute -bottom-1/3 left-1/3 size-[34rem] max-w-[100vw] animate-drift rounded-full bg-warning-line/40 blur-3xl will-change-transform [animation-delay:-9s]" />
    </div>
  );
}

/** A brush-stroke underline that draws itself in under a word. */
export function Swash({ className, delay = 0.9 }: { className?: string; delay?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-x-0 -bottom-[0.06em] h-[0.26em] w-full overflow-visible text-brand-line",
        className,
      )}
    >
      <motion.path
        d="M4 15 C 58 5, 122 3, 182 9 S 268 21, 296 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 0.9, ease: EASE_EDITORIAL }}
      />
    </svg>
  );
}

/** Overlapping faces, Signature avatars first, then a couple of DiceBear ones. */
export function AvatarStack({ count = 5, className }: { count?: number; className?: string }) {
  const generated = useGeneratedFaces(STACK_SEEDS);
  const faces = [...SIGNATURE_FACES.filter((_, i) => i % 3 === 0).slice(0, Math.max(0, count - 2)), ...generated].slice(
    0,
    count,
  );
  return (
    <span aria-hidden className={cn("flex shrink-0 -space-x-3", className)}>
      {faces.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          className="size-9 rounded-full bg-surface object-cover ring-[3px] ring-canvas"
          style={{ zIndex: faces.length - i }}
        />
      ))}
    </span>
  );
}

/** A face in a glass pill that bobs gently beside a card. */
export function FloatingFace({
  src,
  label,
  className,
  delay = 0,
}: {
  src: string;
  label: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-10 hidden animate-bob items-center gap-2 rounded-full bg-surface/90 py-1.5 pr-4 pl-1.5 shadow-raised ring-1 ring-hairline backdrop-blur-md lg:flex",
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-9 rounded-full object-cover" />
      <span className="text-xs font-semibold whitespace-nowrap text-ink">{label}</span>
    </div>
  );
}

/** Pause/play for an ambient animation. */
export function MotionToggle({
  paused,
  onToggle,
  label,
  className,
  tone = "light",
}: {
  paused: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={`Pause ${label}`}
      title={paused ? `Play ${label}` : `Pause ${label}`}
      onClick={onToggle}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full ring-1 backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        tone === "light"
          ? "bg-surface/90 text-ink-soft ring-hairline hover:text-ink"
          : "bg-ink-inverse/15 text-ink-inverse ring-ink-inverse/25 hover:bg-ink-inverse/25",
        className,
      )}
    >
      {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
    </button>
  );
}

function Ring({
  faces,
  inset,
  size,
  spin,
  counter,
  paused,
}: {
  faces: string[];
  inset: string;
  size: string;
  spin: string;
  counter: string;
  paused: boolean;
}) {
  const hold = paused && "[animation-play-state:paused]";
  return (
    <div aria-hidden className={cn("absolute rounded-full will-change-transform", spin, hold)} style={{ inset }}>
      {faces.map((src, i) => {
        const a = (i / faces.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <span
            key={i}
            className="absolute w-max -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%` }}
          >
            {/* Counter-rotates at the same speed, so every face stays upright. */}
            <span className={cn("block", counter, hold)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className={cn(size, "max-w-none rounded-full bg-surface object-cover shadow-card ring-4 ring-canvas")}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Two counter-rotating rings of faces around a centrepiece: the Signature
 * avatars outside, DiceBear faces inside. Modelled on Pixel Perfect's "Orbit
 * carousel" (MIT, see THIRD_PARTY_NOTICES.txt), rebuilt as pure CSS.
 */
export function AvatarOrbit({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [paused, setPaused] = useState(false);
  const inner = useGeneratedFaces(ORBIT_SEEDS);
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[34rem]", className)}>
      <div aria-hidden className="absolute inset-[7%] rounded-full border border-brand-line" />
      <div aria-hidden className="absolute inset-[25%] rounded-full border border-dashed border-lavender-line" />
      <div
        aria-hidden
        className="absolute inset-[36%] rounded-full bg-[radial-gradient(circle,var(--nc-brand-soft),transparent_70%)]"
      />
      <Ring
        faces={SIGNATURE_FACES}
        inset="7%"
        size="size-12 sm:size-16"
        spin="animate-orbit"
        counter="animate-orbit-reverse"
        paused={paused}
      />
      <Ring
        faces={inner}
        inset="25%"
        size="size-9 sm:size-12"
        spin="animate-orbit-fast"
        counter="animate-orbit-fast-reverse"
        paused={paused}
      />
      <div className="absolute inset-[34%] flex items-center justify-center text-center">{children}</div>
      <MotionToggle
        paused={paused}
        onToggle={() => setPaused((p) => !p)}
        label="the circle of faces"
        className="absolute right-0 bottom-0"
      />
    </div>
  );
}

const TOPICS = [
  "PCOS",
  "Fibroids",
  "Irregular cycles",
  "Heavy bleeding",
  "Pelvic pain",
  "Period pain",
  "Early pregnancy",
  "Fertility concerns",
] as const;

/**
 * The conditions Nauri helps with, as a slow editorial marquee. Adapted from
 * Pixel Perfect's "Infinite carousel" (MIT). Hover or the button pauses it;
 * the list is read once by screen readers (the second copy is aria-hidden).
 */
export function CareMarquee() {
  const [paused, setPaused] = useState(false);
  const row = (copy: boolean) => (
    <ul
      aria-hidden={copy || undefined}
      className={cn(
        "flex shrink-0 animate-marquee items-center gap-10 pr-10 will-change-transform",
        paused && "[animation-play-state:paused]",
      )}
    >
      {TOPICS.map((t, i) => (
        <li key={t} className="flex items-center gap-10 whitespace-nowrap">
          <span
            className={cn(
              "font-display text-display-md sm:text-display-lg",
              i % 2 ? "text-ink" : "font-normal text-brand-ink italic",
            )}
          >
            {t}
          </span>
          <Sparkle className="size-5 fill-brand-line text-brand-line" aria-hidden />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="care-heading" className="relative border-y border-hairline bg-surface py-7 sm:py-9">
      <h2 id="care-heading" className="sr-only">
        What Nauri can help with
      </h2>
      <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_7%,black_93%,transparent)] [&:hover_ul]:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
      <MotionToggle
        paused={paused}
        onToggle={() => setPaused((p) => !p)}
        label="the list of conditions"
        className="absolute top-1/2 right-3 -translate-y-1/2 sm:right-6"
      />
    </section>
  );
}
