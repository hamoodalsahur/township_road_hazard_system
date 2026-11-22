import type { Metadata } from "next";
import type { ReactNode } from "react";
import ResidentShell from "@/components/resident/ResidentShell";
import { PRODUCT_NAME } from "@/lib/product";

export const metadata: Metadata = { title: `${PRODUCT_NAME}: road problems near you` };

/** Resident website (roadmap 4.3): Map, Report a problem and My reports, in the Night Desk frame. */
export default function ResidentLayout({ children }: { children: ReactNode }) {
  return <ResidentShell>{children}</ResidentShell>;
}
