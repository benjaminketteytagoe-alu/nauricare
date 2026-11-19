"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Modal dialog and side sheet on Base UI's Dialog: focus is trapped and
// restored, Escape closes, the page behind is inert, and the title and
// description are wired to aria-labelledby/-describedby.

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const popupVariants = cva(
  "fixed z-50 flex flex-col bg-surface text-ink shadow-raised outline-none transition-[opacity,translate,scale] duration-300 ease-editorial",
  {
    variants: {
      side: {
        center:
          "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-hairline p-6 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
        right:
          "inset-y-0 right-0 h-dvh w-[min(28rem,100vw)] overflow-y-auto border-l border-hairline p-6 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-card border-t border-hairline p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
      },
    },
    defaultVariants: { side: "center" },
  },
);

function DialogContent({
  className,
  children,
  side,
  showClose = true,
  ...props
}: DialogPrimitive.Popup.Props & VariantProps<typeof popupVariants> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-surface-inverse/40 backdrop-blur-[2px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn(popupVariants({ side }), className)} {...props}>
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

/** A side or bottom sheet: the same dialog, anchored to an edge. */
function SheetContent({ side = "right", ...props }: Parameters<typeof DialogContent>[0]) {
  return <DialogContent side={side} {...props} />;
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("mb-4 flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-display text-display-sm text-ink", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-ink-muted", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  SheetContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
