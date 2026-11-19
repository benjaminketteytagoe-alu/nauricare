import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";
import { cn } from "@/lib/utils";

// Field border is `field` (3.4:1 on white, WCAG 1.4.11). Errors are marked
// with aria-invalid so the state is announced, not only coloured.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-field border border-field bg-surface px-3.5 py-2 text-base text-ink transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-ink-muted hover:border-ink-muted focus-visible:border-focus focus-visible:ring-3 focus-visible:ring-focus/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
