"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Adapted from Pixel Perfect's "Sparkle grid background" (MIT, see
// THIRD_PARTY_NOTICES.txt): drifting clusters of dots that bloom into
// four-point sparkles, one cluster following the pointer. Changes: no grid
// lines or fill (it sits on the page's own background), the glyphs take the
// element's text colour (a token class, so it follows the theme), and lower
// density. It is decorative
// (aria-hidden), pauses off screen and in background tabs, and draws one
// still frame under reduced motion.

const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

/** Smooth value noise in [0, 1]. */
const noise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

export function SparkleField({
  className,
  size = 34,
  speed = 0.6,
}: {
  className?: string;
  /** Cell size in px. */
  size?: number;
  speed?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!host || !canvas || !ctx) return;
    const cell = Math.max(12, size);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const dark = matchMedia("(prefers-color-scheme: dark)");
    let color = "";
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let shown = new Float32Array(0);
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let visible = false;
    const pointer = { x: 0, y: 0, strength: 0, target: 0 };

    const readColor = () => {
      color = getComputedStyle(host).color;
    };

    const draw = (instant = false) => {
      ctx.clearRect(0, 0, width, height);
      pointer.strength += (pointer.target - pointer.strength) * 0.08;
      const t = elapsed;
      const lens = cell * 1.9;
      const dots = new Path2D();
      const sparkles = new Path2D();
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < columns; i++) {
          const k = j * columns + i;
          const x = (i + 0.5) * cell;
          const y = (j + 0.5) * cell;
          const n =
            noise(i * 0.24 + t * 0.12, j * 0.24 - t * 0.08) * 0.7 + noise(i * 0.55 - t * 0.14, j * 0.55 + 9) * 0.3;
          let goal = Math.max(0, (n - 0.64) / 0.2);
          if (pointer.strength > 0.001) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            goal += pointer.strength * Math.exp(-(dx * dx + dy * dy) / (lens * lens));
          }
          goal = Math.min(1, goal);
          shown[k] = instant ? goal : shown[k] + (goal - shown[k]) * 0.1;
          const s = shown[k];
          if (s < 0.08) continue;
          if (s < 0.72) {
            const r = cell * (0.03 + 0.12 * (s / 0.72));
            dots.moveTo(x + r, y);
            dots.arc(x, y, r, 0, Math.PI * 2);
          } else {
            const r = cell * (0.24 + 0.1 * ((s - 0.72) / 0.28));
            sparkles.moveTo(x, y - r);
            sparkles.quadraticCurveTo(x, y, x + r, y);
            sparkles.quadraticCurveTo(x, y, x, y + r);
            sparkles.quadraticCurveTo(x, y, x - r, y);
            sparkles.quadraticCurveTo(x, y, x, y - r);
          }
        }
      }
      ctx.fillStyle = color;
      ctx.fill(dots);
      ctx.fill(sparkles);
    };

    const tick = (now: number) => {
      elapsed += Math.min((now - previous) / 1000, 0.1) * speed;
      previous = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      readColor();
      if (reducedMotion.matches) pointer.target = pointer.strength = 0;
      draw(reducedMotion.matches);
      if (visible && !document.hidden && !reducedMotion.matches && speed > 0) {
        previous = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
      shown = new Float32Array(columns * rows);
      draw(true);
    };

    // The canvas ignores the pointer, so listen on the section it decorates.
    const area = host.parentElement ?? host;
    const move = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.target = 1;
    };
    const leave = () => {
      pointer.target = 0;
    };

    readColor();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    intersection.observe(host);
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    reducedMotion.addEventListener("change", update);
    dark.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
      reducedMotion.removeEventListener("change", update);
      dark.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [size, speed]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden text-brand-line", className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
