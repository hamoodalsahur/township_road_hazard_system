import type { Metadata } from "next";
import WayHomeSetup from "@/components/resident/WayHomeSetup";

export const metadata: Metadata = { title: "Your home for way home" };

export default function ResidentHomePage() {
  return <WayHomeSetup />;
}
