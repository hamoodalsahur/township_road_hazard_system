"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowClockwiseIcon, ArrowRightIcon, CameraIcon, CaretRightIcon, CheckIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useManagementOperatorKey } from "@/components/management/ManagementShell";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import ReviewAgeQueue from "@/components/management/ReviewAgeQueue";
import OperatorAuditSummary from "@/components/management/OperatorAuditSummary";
import HazardMarker from "@/components/hazards/HazardMarker";
import { ReviewStateChip, SeverityChip } from "@/components/hazards/HazardChips";
import { categoryLabel, formatAge, highestSeverity } from "@/lib/hazard-presentation";
import { decisionQueue, groupLink, groupsUnderReview, overviewSummary, recentReports, reportLink } from "@/lib/overview-queue";

type OverviewMetrics = { totalReports: number; unverifiedReports: number; activeIncidents: number; resolvedIncidents: number };
type Report = { id: string; category: string; description: string; impact: string; reviewState: string; createdAt: string };
type Group = { id: string; title: string; category: string; status: string; createdAt: string; reports: { report: { impact?: string } }[] };
type Data = { metrics: OverviewMetrics; reports: Report[]; groups: Group[]; photos: Record<string, string> | null };

const card = "overflow-hidden rounded-3xl bg-white shadow-md";
const cardTitle = "flex flex-1 items-center gap-2.5 text-lg font-semibold tracking-tight text-slate-900";
const countBadge = (hot: boolean) => "rounded-full px-2.5 py-0.5 text-[13px] font-semibold " + (hot ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600");
const footer = "flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-[13px] text-slate-500 sm:px-6";
const textLink = "inline-flex min-h-9 items-center gap-1 whitespace-nowrap text-sm font-semibold text-teal-800 hover:underline";
const rowLink = "flex items-center gap-3 rounded-2xl px-2.5 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800";

/** Overview, queue first: what needs a decision comes before anything else. */
export default function OverviewPage() {
  const operatorKey = useManagementOperatorKey();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const reload = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const headers = { "x-demo-operator-key": operatorKey };
      const [oversight, feed, incidents, photos] = await Promise.all([
        fetch("/api/v2/incident-oversight", { headers, cache: "no-store" }),
        fetch("/api/v2/hazards", { cache: "no-store" }),
        fetch("/api/v2/incidents", { headers, cache: "no-store" }),
        fetch("/api/v2/evidence-states", { headers, cache: "no-store" }).catch(() => null),
      ]);
      if (!oversight.ok || !feed.ok || !incidents.ok) throw Error("Check that the local server is running, then try again.");
      const a = await oversight.json() as { metrics?: OverviewMetrics };
      const b = await feed.json() as { reports?: Report[] };
      const c = await incidents.json() as { incidents?: Group[] };
      if (!a.metrics || !Array.isArray(b.reports) || !Array.isArray(c.incidents)) throw Error("Overview data was incomplete.");
      // Photo markers are a convenience; the overview still loads without them.
      const p = photos?.ok ? await photos.json().catch(() => null) as { states?: Record<string, string> } | null : null;
      setData({ metrics: a.metrics, reports: b.reports, groups: c.incidents, photos: p?.states ?? null });
      setNow(Date.now());
    } catch (e) {
      // Old figures are hidden after a failed refresh so nobody acts on them.
      setData(null);
      setError(e instanceof Error ? e.message : "Overview is unavailable.");
    } finally { setBusy(false); }
  }, [operatorKey]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener("township-hazards-updated", refresh);
    return () => window.removeEventListener("township-hazards-updated", refresh);
  }, [reload]);

  const queue = data ? decisionQueue(data.reports, 5, now) : null;
  const groups = data ? groupsUnderReview(data.groups) : null;
  const recent = data ? recentReports(data.reports, 4) : [];
  const summary = data && queue && groups ? overviewSummary({
    needsDecision: queue.total, groupsUnderReview: groups.total, totalReports: data.metrics.totalReports, resolvedGroups: data.metrics.resolvedIncidents,
  }) : [];
  const startLink = queue?.oldestId ? reportLink(queue.oldestId) : "/management/incidents#report-review";

  return <>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><ManagementSectionHeading section="overview" subtitle={<p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-slate-600" aria-live="polite">
        {error ? "Could not load the overview" : busy && !data ? "Loading the latest reports…" : summary.map((part, index) => <span key={part} className="inline-flex items-center gap-2">
          {index === 0 ? <span aria-hidden="true" className={"h-2 w-2 rounded-full " + (queue?.total ? "bg-slate-900" : "bg-teal-800")} /> : null}
          <span className={index === 0 ? "font-semibold text-slate-900" : ""}>{part}</span>
        </span>)}
      </p>} /></div>
      <button type="button" onClick={() => void reload()} disabled={busy}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50 sm:px-4">
        <ArrowClockwiseIcon size={18} aria-hidden="true" /><span className="sr-only sm:not-sr-only">{busy ? "Loading…" : "Refresh"}</span>
      </button>
    </div>

    {error ? <div role="alert" className="flex max-w-2xl gap-3 rounded-2xl bg-rose-50 p-4 text-sm leading-5 text-rose-800">
      <WarningCircleIcon size={22} weight="bold" className="shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold text-rose-950">Could not load the overview. Nothing is shown so you don&apos;t act on out-of-date information.</p>
        <p className="mt-1">{error}</p>
        <button type="button" onClick={() => void reload()} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-sm"><ArrowClockwiseIcon size={16} aria-hidden="true" />Try again</button>
      </div>
    </div> : null}

    {busy && !data && !error ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]" aria-hidden="true">
      <div className="h-80 animate-pulse rounded-3xl bg-slate-100" /><div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
    </div> : null}

    {data && queue && groups ? <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className={card} aria-labelledby="needs-decision">
        <div className="flex items-center gap-3 px-5 pb-2 pt-5 sm:px-6">
          <h2 id="needs-decision" className={cardTitle}>Needs your decision <span className={countBadge(queue.total > 0)}>{queue.total}</span></h2>
          {queue.total > 0 ? <Link href={startLink} className="hidden min-h-11 items-center gap-2 rounded-full bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-700 sm:inline-flex">
            Start reviewing<ArrowRightIcon size={16} aria-hidden="true" /></Link> : null}
        </div>
        {queue.total === 0 ? <div className="flex items-center gap-4 px-5 pb-5 pt-2 sm:px-6">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-teal-100"><CheckIcon size={26} weight="bold" className="text-teal-800" aria-hidden="true" /></span>
          <div><h3 className="text-lg font-semibold text-slate-900">All caught up</h3>
            <p className="text-[15px] text-slate-600">No reports are waiting for a decision. New resident reports appear here as soon as they are sent.</p></div>
        </div> : <ul className="px-3 pb-2 sm:px-3.5">
          {queue.items.map(({ report, wait, overADay }) => <li key={report.id} className="border-b border-slate-100 last:border-0">
            <Link href={reportLink(report.id)} className={rowLink}>
              <HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} size={34} decorative />
              <span className="min-w-0 flex-1">
                <strong className="block text-[15px] font-semibold text-slate-900">{categoryLabel(report.category)}</strong>
                <span className="mb-1.5 mt-0.5 block truncate text-sm text-slate-600">{report.description}</span>
                <span className="flex items-center gap-2"><SeverityChip impact={report.impact} />
                  {data.photos?.[report.id] && data.photos[report.id] !== "none" ? <span className="inline-flex items-center gap-1 text-xs text-slate-500"><CameraIcon size={14} aria-hidden="true" />Photo</span> : null}</span>
              </span>
              <span className="flex min-w-[76px] flex-col items-end text-right">
                <time dateTime={report.createdAt} title={new Date(report.createdAt).toLocaleString()} className={"font-mono text-sm text-slate-900 " + (overADay ? "font-semibold" : "")}>{wait}</time>
                <span className="text-xs text-slate-500">{overADay ? "waiting · over a day" : "waiting"}</span>
              </span>
              <CaretRightIcon size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
          </li>)}
        </ul>}
        {queue.total > 0 ? <div className="px-5 pb-4 sm:hidden">
          <Link href={startLink} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-800 text-[15px] font-semibold text-white">Start reviewing<ArrowRightIcon size={16} aria-hidden="true" /></Link>
        </div> : null}
        <div className={footer}>
          <span>{queue.more ? `${queue.more} more waiting. ` : ""}{queue.total ? "Oldest first. Opening a report takes you to it in Incidents." : "Checked just now."}</span>
          <Link href="/management/incidents#report-review" className={textLink}>All reports<CaretRightIcon size={15} aria-hidden="true" /></Link>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <section className={card} aria-labelledby="groups-under-review">
          <div className="px-5 pb-2 pt-5 sm:px-6"><h2 id="groups-under-review" className={cardTitle}>Incident groups under review <span className={countBadge(false)}>{groups.total}</span></h2></div>
          {groups.total === 0 ? <p className="px-5 pb-5 text-sm text-slate-600 sm:px-6">No incident groups are under review.</p> : <ul className="px-3 pb-2">
            {groups.items.map(group => <li key={group.id} className="border-b border-slate-100 last:border-0">
              <Link href={groupLink(group.id)} className={rowLink + " py-2.5"}>
                <HazardMarker category={group.category} impact={highestSeverity(group.reports.map(link => link.report.impact)).key} reviewState="unverified" size={26} decorative />
                <span className="min-w-0 flex-1"><strong className="block truncate text-[15px] font-semibold text-slate-900">{group.title}</strong>
                  <span className="text-[13px] text-slate-500">{group.reports.length} {group.reports.length === 1 ? "report" : "reports"} · opened {formatAge(group.createdAt, now)} ago</span></span>
                <CaretRightIcon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>)}
          </ul>}
          <div className={footer}><span>{groups.more ? `${groups.more} more under review.` : ""}</span>
            <Link href="/management/incidents#incident-groups" className={textLink}>Open incident groups<CaretRightIcon size={15} aria-hidden="true" /></Link></div>
        </section>

        <section className={card} aria-labelledby="recent-reports">
          <div className="px-5 pb-2 pt-5 sm:px-6"><h2 id="recent-reports" className={cardTitle}>Recent reports</h2></div>
          {recent.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-600 sm:px-6">No reports yet.</p> : <ul className="px-3 pb-2">
            {recent.map(report => <li key={report.id} className="border-b border-slate-100 last:border-0">
              <Link href={reportLink(report.id)} className={rowLink + " py-2.5"}>
                <HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} size={26} decorative />
                <span className="min-w-0 flex-1"><strong className="block text-[15px] font-semibold text-slate-900">{categoryLabel(report.category)}</strong>
                  <time dateTime={report.createdAt} className="text-[13px] text-slate-500">{formatAge(report.createdAt, now)} ago</time></span>
                <ReviewStateChip reviewState={report.reviewState} />
              </Link>
            </li>)}
          </ul>}
          <div className={footer}><span /><Link href="/management/incidents#report-review" className={textLink}>View all reports<CaretRightIcon size={15} aria-hidden="true" /></Link></div>
        </section>
      </div>
    </div> : null}

    <details className="group mt-5 rounded-2xl bg-white shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-[15px] font-semibold text-slate-900 sm:px-6">
        <CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />Review ages and operator activity
        <span className="text-[13px] font-normal text-slate-500">Advanced · read-only counts</span>
      </summary>
      <div className="grid items-start gap-4 px-5 pb-5 sm:px-6 xl:grid-cols-2"><ReviewAgeQueue operatorKey={operatorKey} /><OperatorAuditSummary operatorKey={operatorKey} /></div>
    </details>
  </>;
}
