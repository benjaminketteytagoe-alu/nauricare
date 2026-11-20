"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { HeartPulse, Play, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Reveal } from "@/components/ui/motion";
import { SparkleField } from "@/components/ui/sparkle-field";
import { MotionToggle } from "./flourishes";

// The NauriCare film. The section plays a silent 12-second cut of it on loop
// (women walking by the lake, the symptom checker, a woman booking a
// specialist), graded plum so it sits in the palette. "Watch the film" opens
// the full 95-second version with sound and controls. Cloudinary cuts,
// resizes and strips the audio on the fly, so the loop is ~1.3 MB instead of
// 23 MB, and it only loads and plays while it is on screen.
const CLOUD = "https://res.cloudinary.com/dl2fjmhft/video/upload";
const ID = "v1781604133/Nauricare_App_Demo_itl2vz";
const FILM = `${CLOUD}/${ID}.mp4`;
const LOOP = `${CLOUD}/so_29,eo_41,ac_none,w_1280,q_auto/${ID}.mp4`;
const POSTER = `${CLOUD}/so_33,w_1280,q_auto/${ID}.jpg`;

const CHIPS = [
  { Icon: HeartPulse, label: "Symptom checker", className: "-left-6 top-[18%]", delay: 0 },
  { Icon: Stethoscope, label: "Verified specialists", className: "-right-8 top-[42%]", delay: 1.4 },
  { Icon: ShieldCheck, label: "Private by design", className: "-left-10 bottom-[16%]", delay: 2.6 },
] as const;

export function FilmSection() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);

  // The frame opens from an arch into a wide screen as it scrolls into view.
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const arch = useTransform(scrollYProgress, [0, 1], ["16rem", "2rem"]);

  // Play only while visible, never under reduced motion or while the full film is open.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (reduce || paused || open) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (v.preload === "none") v.preload = "auto";
          v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduce, paused, open]);

  return (
    <section
      aria-labelledby="film-heading"
      className="relative isolate overflow-hidden bg-surface-inverse px-4 py-20 text-ink-inverse sm:px-6 sm:py-28 lg:px-8"
    >
      <SparkleField className="-z-10 opacity-50 [mask-image:radial-gradient(ellipse_at_50%_20%,black,transparent_70%)]" />
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-eyebrow font-semibold text-brand-line uppercase">The NauriCare film</p>
          <h2
            id="film-heading"
            className="font-display text-display-md text-balance text-ink-inverse sm:text-display-lg"
          >
            Care that meets you <em className="font-normal text-brand-line">where you are.</em>
          </h2>
          <p className="text-lg leading-relaxed text-ink-inverse/80">
            Ninety seconds inside NauriCare: the symptom checker, verified specialists and support that stays private.
          </p>
        </Reveal>

        <div ref={frame} className="relative mt-12 sm:mt-16">
          <motion.div
            style={
              reduce
                ? undefined
                : { scale, borderTopLeftRadius: arch, borderTopRightRadius: arch, willChange: "transform" }
            }
            className="relative mx-auto aspect-video max-w-5xl overflow-hidden rounded-[2rem] bg-surface-muted shadow-raised ring-1 ring-ink-inverse/15"
          >
            <video
              ref={video}
              aria-hidden
              tabIndex={-1}
              muted
              loop
              playsInline
              preload="none"
              poster={POSTER}
              className="absolute inset-0 size-full object-cover"
            >
              <source src={LOOP} type="video/mp4" />
            </video>
            {/* Plum grade, so the film's indigo and orange sit in the palette. */}
            <div aria-hidden className="absolute inset-0 bg-brand-pressed opacity-35 mix-blend-color" />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-surface-inverse/85 via-surface-inverse/10 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-8">
              <Button variant="premium" size="lg" onClick={() => setOpen(true)} className="max-sm:h-11 max-sm:px-5">
                <Play className="fill-current" aria-hidden />
                Watch the film
                <span className="font-normal opacity-80">1:35</span>
              </Button>
              <MotionToggle
                tone="dark"
                paused={paused}
                onToggle={() => setPaused((p) => !p)}
                label="the background film"
              />
            </div>
          </motion.div>

          {CHIPS.map(({ Icon, label, className, delay }) => (
            <div
              key={label}
              aria-hidden
              className={`absolute z-10 hidden animate-bob items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-raised ring-1 ring-hairline xl:flex ${className}`}
              style={{ animationDelay: `${delay}s` }}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <Icon className="size-4" />
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl gap-0 p-2 pt-12 sm:p-3 sm:pt-12">
          <DialogTitle className="sr-only">The NauriCare film</DialogTitle>
          <video
            controls
            autoPlay
            playsInline
            poster={POSTER}
            className="aspect-video w-full rounded-[calc(var(--radius-card)-0.5rem)] bg-surface-inverse"
          >
            <source src={FILM} type="video/mp4" />
          </video>
        </DialogContent>
      </Dialog>
    </section>
  );
}
