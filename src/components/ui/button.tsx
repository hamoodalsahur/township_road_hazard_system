import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Buttons (shadcn/ui, restyled for Night Desk, docs/DESIGN.md section 8).
 * - `primary`: navy, the main action on a screen ("Start reviewing").
 * - `approve`: jade, positive decisions only. `reject`: quiet red outline, never a filled red.
 * - `night` and `nightGhost`: actions placed on the navy top bar or page header.
 * Heights are 44 px (touch target) except `sm`, which is for dense desktop toolbars.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-night text-white hover:bg-night-raised",
        approve: "bg-teal-800 text-white hover:bg-teal-700",
        reject: "border border-rose-200 bg-white text-rose-800 hover:border-rose-300 hover:bg-rose-50",
        secondary: "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        night: "border border-night-edge bg-night-raised text-night-text hover:border-night-subtle hover:text-white",
        nightGhost: "text-night-muted hover:bg-night-raised hover:text-white",
        link: "h-auto px-0 text-teal-800 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 text-body",
        sm: "h-9 px-4 text-small",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(asChild ? {} : { type: type ?? "button" })}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
