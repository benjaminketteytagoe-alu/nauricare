import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// The primary variant's inset top highlight and press scale are adapted from
// Pixel Perfect's "Stripe button" (MIT, see THIRD_PARTY_NOTICES.md), recoloured
// to the brand tokens. The press scale is a transform, so reduced motion
// removes it with every other transition.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-editorial select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand text-on-brand shadow-button hover:bg-brand-hover active:bg-brand-pressed",
        secondary: "bg-surface-muted text-ink hover:bg-hairline",
        outline: "border border-field bg-surface text-ink hover:border-ink-muted hover:bg-surface-muted",
        ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
        link: "rounded-sm px-0 text-brand-ink underline-offset-4 hover:underline active:scale-100",
        destructive: "bg-danger text-surface shadow-button hover:opacity-90",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Next <Link>) with button styling. */
  asChild?: boolean;
  /** Shows a spinner, sets aria-busy and blocks clicks. Ignored with asChild. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button className={classes} ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
