"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CheckCircleIcon, ExportIcon, InfoIcon, MapPinLineIcon, RoadHorizonIcon, SparkleIcon, StackIcon, WarningIcon, type Icon,
} from "@phosphor-icons/react";
import { useServiceArea } from "@/hooks/useServiceArea";
import { auditActionLabel, auditCsv, auditPhotoPublished, auditReason, type AuditEntry } from "@/lib/system-audit";
import { clockTime } from "@/lib/overview-today";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Quality = { issueCount: number; reportCount: number; incidentCount: number };
type Manifest = { roadLines: number; namedWayLines: number };
type State = "ok" | "check" | "info" | "loading";

function StatusCard({ icon: Glyph, title, state, value, children }: { icon: Icon; title: string; state: State; value: ReactNode; children: ReactNode }) {
  const pill = state === "ok" ? { text: "OK", className: "bg-teal-100 text-teal-900", Icon: CheckCircleIcon }
    : state === "check" ? { text: "Check", className: "bg-rose-50 text-rose-800", Icon: WarningIcon }
    : state === "info" ? { text: "Info", className: "bg-slate-100 text-slate-700", Icon: InfoIcon } : null;
  return <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <Glyph size={20} className="text-slate-700" aria-hidden="true" />
      <h2 className="text-body font-semibold text-slate-900">{title}</h2>
      {pill ? <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption font-semibold", pill.className)}><pill.Icon size={14} weight="fill" aria-hidden="true" />{pill.text}</span>
        : <span className="ml-auto text-caption text-slate-600">Checking…</span>}
    </div>
    <p className="mt-3 font-display text-title font-semibold text-slate-900">{value}</p>
    <div className="mt-1 text-small text-slate-600">{children}</div>
  </section>;
}

/**
 * System & Audit, Night Desk: four status cards and the latest operator actions. Everything here is
 * read-only; "Run checks again" only reloads the same counts.
 */
export default function SystemOverview({ operatorKey, reloadToken = 0 }: { operatorKey: string; /** Changes when "Run checks again" is pressed. */ reloadToken?: number }) {
  const area = useServiceArea();
  const [quality, setQuality] = useState<Quality | null | undefined>(undefined);
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  const [audit, setAudit] = useState<AuditEntry[] | null | undefined>(undefined);
  const load = useCallback(async () => {
    setQuality(undefined); setManifest(undefined); setAudit(undefined);
    const headers = { "x-demo-operator-key": operatorKey };
    const get = async <T,>(url: string, pick: (data: Record<string, unknown>) => T | undefined) => {
      try { const response = await fetch(url, { headers, cache: "no-store" }); if (!response.ok) return null; return pick(await response.json() as Record<string, unknown>) ?? null; }
      catch { return null; }
    };
    const [q, m, a] = await Promise.all([
      get<Quality>("/api/v2/demo-quality", data => typeof data.issueCount === "number" ? data as unknown as Quality : undefined),
      get<Manifest>("/api/v2/geo-source-manifest", data => data.manifest as Manifest | undefined),
      get<AuditEntry[]>("/api/audit", data => Array.isArray(data.entries) ? data.entries as AuditEntry[] : undefined),
    ]);
    setQuality(q); setManifest(m); setAudit(a);
  }, [operatorKey]);
  useEffect(() => { void load(); }, [load, reloadToken]);

  function exportCsv() {
    if (!audit?.length) return;
    const url = URL.createObjectURL(new Blob([auditCsv(audit)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `laluan-operator-actions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(url);
  }

  const unnamed = manifest ? manifest.roadLines - manifest.namedWayLines : 0;
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatusCard icon={MapPinLineIcon} title="Service area" state={!area.loaded ? "loading" : area.failed || area.data.fallbackReason ? "check" : "ok"} value={area.data.area.name}>
        {area.data.fallbackReason ? <>Using the default area: {area.data.fallbackReason}</> : <>Reports outside this area are refused</>}
      </StatusCard>
      <StatusCard icon={StackIcon} title="Data consistency" state={quality === undefined ? "loading" : quality === null ? "check" : quality.issueCount ? "check" : "ok"}
        value={quality ? `${quality.issueCount} ${quality.issueCount === 1 ? "issue" : "issues"}` : quality === null ? "Unavailable" : "…"}>
        {quality ? <>{quality.reportCount} reports and {quality.incidentCount} groups checked</> : quality === null ? <>The check could not run</> : null}
      </StatusCard>
      <StatusCard icon={RoadHorizonIcon} title="Road data" state={manifest === undefined ? "loading" : !manifest || manifest.roadLines === 0 ? "check" : "ok"}
        value={manifest ? `${manifest.roadLines.toLocaleString()} road lines` : manifest === null ? "Not loaded" : "…"}>
        {manifest ? <>OpenStreetMap, not verified on the ground.{unnamed > 0 ? ` ${unnamed} have no name.` : ""}</> : manifest === null ? <>The local road file is missing or empty</> : null}
      </StatusCard>
      <StatusCard icon={SparkleIcon} title="AI help" state="info" value="Optional">
        Suggests similar reports when a local model is running. A person always decides. <Link href="/management/research" className="font-semibold text-teal-800 hover:underline">AI &amp; Research</Link>
      </StatusCard>
    </div>

    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="operator-actions">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <h2 id="operator-actions" className="font-display text-heading font-semibold text-slate-900">Operator actions</h2>
        <span className="text-small text-slate-600">Latest 50, newest first</span>
        <Button variant="secondary" size="sm" className="ml-auto" disabled={!audit?.length} onClick={exportCsv}><ExportIcon size={16} aria-hidden="true" />Export CSV</Button>
      </div>
      {audit === undefined ? <p className="p-4 text-small text-slate-600">Loading…</p>
        : audit === null ? <p role="alert" className="p-4 text-small text-rose-800">Operator actions could not be loaded</p>
        : audit.length === 0 ? <p className="p-4 text-small text-slate-600">No operator actions yet. Decisions and group changes appear here.</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-small">
          <thead><tr className="bg-slate-50 text-caption font-medium text-slate-600">
            <th scope="col" className="px-4 py-2 font-medium">When</th><th scope="col" className="px-4 py-2 font-medium">Action</th>
            <th scope="col" className="px-4 py-2 font-medium">On</th><th scope="col" className="px-4 py-2 font-medium">Reason given</th>
          </tr></thead>
          <tbody>{audit.slice(0, 50).map(entry => <tr key={entry.id} className="border-t border-slate-100 align-top">
            <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700"><time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString()}>
              {new Date(entry.createdAt).toDateString() === new Date().toDateString() ? clockTime(entry.createdAt) : new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + clockTime(entry.createdAt)}</time></td>
            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{auditActionLabel(entry)}{auditPhotoPublished(entry) ? <span className="block text-caption font-normal text-slate-600">Photo shown to residents</span> : null}</td>
            <td className="px-4 py-3 font-mono text-caption text-slate-700">{entry.subjectId}</td>
            <td className="px-4 py-3 text-slate-700">{auditReason(entry) || <span className="text-slate-500">None recorded</span>}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </>;
}
