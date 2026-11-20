"use client";

import { useId } from "react";

/** Accessible on/off switch with a label and optional description. */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p id={`${id}-l`} className="font-semibold text-ink">
          {label}
        </p>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 ${checked ? "bg-brand" : "bg-field"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-surface shadow-card transition-transform duration-200 ease-editorial ${checked ? "translate-x-6" : "translate-x-1"}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
