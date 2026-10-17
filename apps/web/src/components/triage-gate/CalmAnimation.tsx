"use client";

import { useRef, useState } from "react";
import { LottieLight, type LottieHandle } from "lottie-react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { tactile } from "./motion";
import calmBreath from "./calm-breath.json";

// Bundled locally: the LottieFiles URL in the original brief now returns 403,
// and loading a third-party asset on a health page would leak visitors' IPs.
// lottie-web touches `document` at import time, so this module is only ever
// loaded through next/dynamic with { ssr: false } (see TriageGate).
export default function CalmAnimation({ onReady }: { onReady?: () => void }) {
  const reduceMotion = useReducedMotion();
  const handle = useRef<LottieHandle>(null);
  const [playing, setPlaying] = useState(!reduceMotion);

  // WCAG 2.2.2: anything that moves for more than five seconds needs a pause.
  function toggle() {
    if (playing) handle.current?.pause();
    else handle.current?.play();
    setPlaying(!playing);
  }

  return (
    <div className="relative h-full w-full">
      {/* LottieLight is the SVG-only build without expression support, which
          is all this hand-authored animation needs, at a smaller bundle cost. */}
      <LottieLight
        src={calmBreath}
        lottieRef={handle}
        loop
        autoplay={!reduceMotion}
        subscriptions={onReady ? { ready: onReady } : undefined}
        className="h-full w-full"
        aria-hidden
      />
      <motion.button
        type="button"
        {...tactile}
        onClick={toggle}
        aria-label={playing ? "Pause breathing animation" : "Play breathing animation"}
        className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-[#FFE4E6] bg-white text-[#475569] shadow-sm hover:text-[#0F172A] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
      >
        {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      </motion.button>
    </div>
  );
}
