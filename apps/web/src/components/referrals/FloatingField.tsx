import type { InputHTMLAttributes } from "react";

// Material 3 outlined text field: the label rests inside the field and floats
// onto the border when the field is focused or filled. Relies on the
// `placeholder=" "` trick so :placeholder-shown means "empty".
export function FloatingField({
  id,
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`peer m3-input h-14 pt-5 ${error ? "border-nc-berry focus:border-nc-berry focus:ring-nc-berry" : ""}`}
          {...props}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-3 top-1.5 bg-white px-1 text-xs font-medium text-slate-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-nc-primary"
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 px-1 text-xs font-medium text-nc-berry">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 px-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
