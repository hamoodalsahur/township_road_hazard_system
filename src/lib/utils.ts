import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Teach tailwind-merge our named text sizes (tailwind.config.ts), so `text-caption` is treated as a
 * size and not a colour. Without this, `cn("text-caption", "text-slate-600")` would drop one of them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "small", "body", "heading", "title", "display"] }],
    },
  },
});

/** Join class names and let later Tailwind classes win over earlier ones (the shadcn/ui helper). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
