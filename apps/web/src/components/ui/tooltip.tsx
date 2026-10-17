"use client";

import { useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Material 3 "plain tooltip". Rendered in a fixed-position portal so it is
// never clipped by a scrolling parent (e.g. a sidebar nav with overflow-y).
// Shown on hover and keyboard focus; `disabled` turns it into a passthrough.

export function Tooltip({
  label,
  children,
  side = "right",
  disabled = false,
}: {
  label: ReactNode;
  children: ReactElement;
  side?: "right" | "top";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function show() {
    if (disabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos(side === "right" ? { x: r.right + 10, y: r.top + r.height / 2 } : { x: r.left + r.width / 2, y: r.top - 8 });
  }
  const hide = () => setPos(null);

  return (
    <span ref={ref} className="block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {pos &&
        !disabled &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: pos.x, top: pos.y }}
            className={`pointer-events-none fixed z-[100] whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in zoom-in-95 duration-150 ${
              side === "right" ? "-translate-y-1/2" : "-translate-x-1/2 -translate-y-full"
            }`}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
