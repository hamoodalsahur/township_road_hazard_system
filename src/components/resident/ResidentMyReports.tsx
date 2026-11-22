"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import HazardMarker from "@/components/hazards/HazardMarker";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/lib/hazard-presentation";
import {
  MY_REPORTS_KEY, parseStoredReports, residentLifecycle, residentStatusLine, sentLabel,
  type PublicReportStatus, type StoredReport,
} from "@/lib/resident-reports";

/** "My reports" (roadmap 4.3): reports sent from this browser, each with its progress. Ids stay in this browser. */
export default function ResidentMyReports() {
  const [mine, setMine] = useState<StoredReport[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, PublicReportStatus> | null>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback((list: StoredReport[]) => {
    if (list.length === 0) { setStatuses({}); return; }
    setChecking(true); setFailed(false);
    fetch(`/api/v2/hazards/status?ids=${list.map(r => r.id).join(",")}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("unavailable"); return r.json() as Promise<{ reports: PublicReportStatus[] }>; })
      .then(data => setStatuses(Object.fromEntries(data.reports.map(s => [s.id, s]))))
      .catch(() => setFailed(true))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    let list: StoredReport[] = [];
    try { list = parseStoredReports(localStorage.getItem(MY_REPORTS_KEY)); } catch { /* storage blocked: show none */ }
    setMine(list);
    refresh(list);
  }, [refresh]);

  return <div className="flex flex-1 flex-col">
    <section className="bg-night px-4 pb-5 pt-4 text-night-text sm:px-8">
      <div className="mx-auto flex max-w-2xl items-end gap-3">
        <div>
          <h1 className="font-display text-display font-semibold">My reports</h1>
          <p className="mt-1 text-body text-night-muted">What happened to the problems you reported</p>
        </div>
        {mine && mine.length ? <Button variant="nightGhost" size="sm" className="ml-auto" onClick={() => refresh(mine)} disabled={checking}>
          <ArrowClockwiseIcon size={16} aria-hidden="true" />{checking ? "Checking…" : "Check again"}</Button> : null}
      </div>
    </section>
    <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-0">
      {failed ? <p role="alert" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-small text-slate-700">Progress could not be checked just now. The list below may be out of date.</p> : null}
      {mine === null ? <p role="status" className="text-body text-slate-600">Loading…</p> : mine.length === 0
        ? <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-body font-semibold">You haven&apos;t sent any reports from this browser yet.</p>
            <p className="mt-1 text-small text-slate-600">When you report a problem, it appears here so you can follow what happens to it.</p>
            <Button asChild className="mt-4"><Link href="/resident/report"><PlusIcon size={18} weight="bold" aria-hidden="true" />Report a problem</Link></Button>
          </div>
        : <ul className="grid gap-2.5" aria-label="Reports sent from this browser">
            {mine.map(report => {
              const status = statuses ? statuses[report.id] ?? null : undefined;
              const life = residentLifecycle(status ?? undefined);
              const reviewState = status?.reviewState ?? "unverified";
              return <li key={report.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <HazardMarker category={report.category} impact={report.impact} reviewState={reviewState === "corroborated" ? "corroborated" : "unverified"} size={30} decorative />
                  <div><p className="text-body font-semibold">{categoryLabel(report.category)}</p><p className="text-small text-slate-600">{sentLabel(report.sentAt)}</p></div>
                </div>
                <ol className="mt-3 flex gap-1" aria-label={`Progress: ${status === undefined ? (failed ? "unknown" : "checking") : life.labels[life.current]}`}>
                  {life.labels.map((label, index) => <li key={index} title={label}
                    className={"h-[5px] flex-1 rounded-full " + (index > life.current ? "bg-slate-200" : life.rejected && index === life.current ? "bg-slate-400" : "bg-night")} />)}
                </ol>
                <p className="mt-2 text-body text-slate-700">{status !== undefined ? residentStatusLine(status) : failed ? "Progress unknown for now." : "Checking…"}</p>
              </li>;
            })}
          </ul>}
      <p className="mt-4 text-caption text-slate-600">Kept in this browser only. Clearing your browser data removes this list, not the reports. Only their progress is looked up; nothing else about you is sent.</p>
    </div>
  </div>;
}
