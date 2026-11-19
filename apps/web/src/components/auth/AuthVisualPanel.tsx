"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface AuthVisualSlide {
  src: string;
  tag: string;
  caption: string;
}

interface AuthVisualChip {
  Icon: LucideIcon;
  label: string;
}

interface AuthVisualPanelProps {
  slides: AuthVisualSlide[];
  quote: string;
  chips?: AuthVisualChip[];
  intervalMs?: number;
}

/**
 * Sticky visual trust panel shared by the patient and provider signup pages.
 * Crossfades between slides via Framer Motion's AnimatePresence — both the
 * outgoing and incoming image overlap (absolute + inset-0) so the fade reads
 * as one continuous dissolve rather than a cut.
 */
export function AuthVisualPanel({ slides, quote, chips = [], intervalMs = 5000 }: AuthVisualPanelProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, intervalMs]);

  const active = slides[activeIdx];

  return (
    <div className="hidden lg:block lg:w-1/2 sticky top-0 h-[100dvh] overflow-hidden bg-teal-950">
      <AnimatePresence>
        <motion.img
          key={active.src}
          src={active.src}
          alt={active.tag}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Multi-layer gradient for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/60 to-teal-900/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-teal-950/30 pointer-events-none" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-10 pb-12 text-white">
        {/* Slide indicators */}
        <div className="flex items-center gap-2 mb-7">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setActiveIdx(i)}
              aria-label={`View slide ${i + 1}`}
              className={`rounded-full transition-all duration-500 ${
                i === activeIdx
                  ? "w-7 h-2 bg-white"
                  : "w-2 h-2 bg-white/35 hover:bg-white/60"
              }`}
            />
          ))}
        </div>

        {/* Current slide caption */}
        <div className="mb-7 space-y-1 min-h-[52px]">
          <p className="text-xs font-extrabold tracking-[0.18em] uppercase text-teal-300 transition-opacity duration-500">
            {active.tag}
          </p>
          <p className="text-sm text-white/70 leading-relaxed max-w-xs transition-opacity duration-500">
            {active.caption}
          </p>
        </div>

        {/* Main trust headline */}
        <blockquote className="text-2xl md:text-3xl font-extrabold leading-tight mb-8 drop-shadow-lg">
          &ldquo;{quote}&rdquo;
        </blockquote>

        {/* Trust chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {chips.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2 text-xs font-semibold text-white/90"
              >
                <Icon className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
