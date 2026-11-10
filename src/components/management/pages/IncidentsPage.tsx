"use client";
import { useEffect, useState, type KeyboardEvent } from "react";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import { useManagementOperatorKey } from "@/components/management/ManagementShell";
import IncidentManager from "@/components/management/IncidentManager";
import V2HazardManager from "@/components/management/V2HazardManager";
import ReportWorkspace from "@/components/reports/ReportWorkspace";

type Tab = "report-review" | "incident-groups" | "simulator-reports";
const TABS: Tab[] = ["report-review", "incident-groups", "simulator-reports"];

/**
 * Incidents (roadmap step 4.2): report review and incident groups as tabs.
 * All three panels stay mounted so filters, drafts and selections survive tab switches.
 */
export default function IncidentsPage() {
  const operatorKey = useManagementOperatorKey();
  const [tab, setTab] = useState<Tab>("report-review");
  const [needsReview, setNeedsReview] = useState<number | null>(null);
  const [underReview, setUnderReview] = useState<number | null>(null);

  // Links such as /management/incidents#incident-groups open the matching tab.
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1) as Tab;
      if (TABS.includes(hash)) setTab(hash);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function choose(next: Tab) {
    setTab(next);
    history.replaceState(null, "", "#" + next);
  }
  // Arrow keys move between tabs, as screen reader users expect.
  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = TABS[(TABS.indexOf(tab) + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    choose(next);
    document.getElementById("tab-" + next)?.focus();
  }
  const tabClass = (id: Tab) => "flex min-h-11 items-center gap-2 whitespace-nowrap text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 " +
    (tab === id ? "text-slate-900 shadow-[inset_0_-2.5px_0_#0B7350]" : "text-slate-600 hover:text-slate-900");
  const count = (n: number | null) => n === null ? null : <span className="rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">{n}</span>;

  return <>
    <ManagementSectionHeading section="incidents" />
    <div role="tablist" aria-label="Incidents" onKeyDown={onTabKey} className="mb-5 flex gap-6 overflow-x-auto border-b border-slate-200">
      <button type="button" role="tab" id="tab-report-review" aria-selected={tab === "report-review"} aria-controls="report-review" tabIndex={tab === "report-review" ? 0 : -1}
        onClick={() => choose("report-review")} className={tabClass("report-review")}>Review reports{count(needsReview)}</button>
      <button type="button" role="tab" id="tab-incident-groups" aria-selected={tab === "incident-groups"} aria-controls="incident-groups" tabIndex={tab === "incident-groups" ? 0 : -1}
        onClick={() => choose("incident-groups")} className={tabClass("incident-groups")}>Incident groups{count(underReview)}</button>
      <button type="button" role="tab" id="tab-simulator-reports" aria-selected={tab === "simulator-reports"} aria-controls="simulator-reports" tabIndex={tab === "simulator-reports" ? 0 : -1}
        onClick={() => choose("simulator-reports")} className={tabClass("simulator-reports") + " ml-auto text-sm font-medium"}>Older simulator reports</button>
    </div>
    <section id="report-review" role="tabpanel" aria-labelledby="tab-report-review" hidden={tab !== "report-review"} className="scroll-mt-28">
      <V2HazardManager operatorKey={operatorKey} onCountsChange={setNeedsReview} />
    </section>
    <section id="incident-groups" role="tabpanel" aria-labelledby="tab-incident-groups" hidden={tab !== "incident-groups"} className="scroll-mt-28">
      <IncidentManager operatorKey={operatorKey} onCountsChange={setUnderReview} />
    </section>
    <section id="simulator-reports" role="tabpanel" aria-labelledby="tab-simulator-reports" hidden={tab !== "simulator-reports"} className="scroll-mt-28">
      <p className="mb-4 max-w-3xl text-[15px] leading-6 text-slate-600">Historical simulator reports, kept for the original schematic road-network demonstration. They are separate from resident reports and incident groups.</p>
      <ReportWorkspace view="management" operatorKey={operatorKey} />
    </section>
  </>;
}
