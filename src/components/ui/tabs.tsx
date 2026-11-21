"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Tabs (shadcn/ui on Radix, restyled). Underlined, not boxed.
 * `tone="night"` is for tabs that sit in a navy page header: mint underline on the current tab.
 */
const Tabs = TabsPrimitive.Root;

const listVariants = cva("flex items-center gap-7 overflow-x-auto", {
  variants: { tone: { light: "border-b border-slate-200", night: "" } },
  defaultVariants: { tone: "light" },
});

const triggerVariants = cva(
  "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap text-body font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        light: "text-slate-600 hover:text-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-[inset_0_-3px_0_#111820]",
        night: "text-night-muted hover:text-white data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-3px_0_#7FD4AE]",
      },
    },
    defaultVariants: { tone: "light" },
  },
);

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & VariantProps<typeof listVariants>
>(({ className, tone, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn(listVariants({ tone }), className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & VariantProps<typeof triggerVariants>
>(({ className, tone, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn(triggerVariants({ tone }), className)} {...props} />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-6", className)} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
