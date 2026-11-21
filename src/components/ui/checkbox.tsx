"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/** Checkbox (shadcn/ui on Radix, restyled): 20 px box, navy when ticked. Wrap it in a <label> for a larger target. */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer grid h-5 w-5 shrink-0 place-content-center rounded-[5px] border-[1.5px] border-slate-400 bg-white text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-night data-[state=checked]:bg-night",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="grid place-content-center">
      <CheckIcon size={14} weight="bold" aria-hidden="true" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
