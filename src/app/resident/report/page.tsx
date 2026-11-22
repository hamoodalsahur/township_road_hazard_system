import type { Metadata } from "next";
import ResidentReportFlow from "@/components/resident/ResidentReportFlow";

export const metadata: Metadata = { title: "Report a problem" };

export default function ResidentReportPage() {
  return <ResidentReportFlow />;
}
