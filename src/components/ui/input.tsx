import * as React from "react";

import { cn } from "@/lib/utils";

/** Text input (shadcn/ui, restyled): 44 px tall, 10 px radius, `field` border that meets 3:1. */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-slate-400 bg-white px-4 text-body font-normal text-slate-900 transition-colors placeholder:text-slate-500 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
