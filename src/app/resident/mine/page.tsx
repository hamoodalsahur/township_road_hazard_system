import type { Metadata } from "next";
import ResidentMyReports from "@/components/resident/ResidentMyReports";

export const metadata: Metadata = { title: "My reports" };

export default function ResidentMinePage() {
  return <ResidentMyReports />;
}
