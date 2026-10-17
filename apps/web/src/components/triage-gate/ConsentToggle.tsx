"use client";

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SPRING, tactile } from "./motion";

/** Flo-style explicit consent row. Never pre-ticked: the caller owns `checked`. */
export function ConsentToggle({
  checked,
  onChange,
  title,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <motion.label
      htmlFor={id}
      {...tactile}
      whileHover={{ scale: 1.01 }}
      className={`flex cursor-pointer items-start gap-4 rounded-3xl border p-5 shadow-sm transition-colors hover:shadow-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1D4ED8] has-[:focus-visible]:ring-offset-2 ${
        checked ? "border-[#1D4ED8]/40 bg-blue-50/60" : "border-[#FFE4E6] bg-white"
      }`}
    >
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <motion.span
        aria-hidden
        animate={{ scale: checked ? 1 : 0.92, backgroundColor: checked ? "#1D4ED8" : "#FFFFFF" }}
        transition={SPRING}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#1D4ED8]"
      >
        {checked && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </motion.span>
      <span>
        <span className="block font-semibold text-[#0F172A]">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-[#475569]">{children}</span>
      </span>
    </motion.label>
  );
}
