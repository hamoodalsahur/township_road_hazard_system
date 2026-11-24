"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwiseIcon, CameraIcon, CaretRightIcon, CheckIcon, ClockIcon, PlusIcon, StackIcon, WarningCircleIcon, XIcon,
} from "@phosphor-icons/react";
import { useManagementOperatorKey } from "@/components/management/ManagementShell";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import { Button } from "@/components/ui/button";
import ReviewAgeQueue from "@/components/management/ReviewAgeQueue";
import OperatorAuditSummary from "@/components/management/OperatorAuditSummary";
import TodayTimeline, { type TimelineReport } from "@/components/management/TodayTimeline";
import HazardMarker from "@/components/hazards/HazardMarker";
import OverviewMap from "@/components/hazards/OverviewMap";
import OverviewClosures from "@/components/closures/OverviewClosures";
import { SeverityChip } from "@/components/hazards/HazardChips";
import { categoryLabel, formatAge, highestSeverity } from "@/lib/hazard-presentation";
import { decisionQueue, formatWait, groupLink, groupsUnderReview, reportLink } from "@/lib/overview-queue";
import {
  clockTime, dateLine, decisionsSince, reviewHeadline, shiftLog, startOfLocalDay, todayLine, waitingSince,
  type AuditLike, type ShiftLogItem,
} from "@/lib/overview-today";
import { cn } from "@/lib/utils";

type OverviewMetrics = { totalReports: number; unverifiedReports: number; activeIncidents: number; resolvedIncidents: number };
type Report = { id: string; category: string; description: string; impact: string; reviewState: string; createdAt: string; longitude: number; latitude: number };
type Group = { id: string; title: string; category: string; status: string; createdAt: string; reports: { report: { impact?: string } }[] };
type Today = { received: number; reports: TimelineReport[] } | null;
type Data = { metrics: OverviewMetrics; today: Today; reports: Report[]; logReports: Report[]; groups: Group[]; audit: AuditLike[] | null; photos: Record<string, string> | null };

const CARDS = 3;
const panel = "rounded-xl border border-slate-200 bg-white";
const textLink = "inline-flex min-h-9 items-center gap-1 whitespace-nowrap text-small font-semibold text-teal-800 hover:underline";
const LOG_ICON: Record<ShiftLogItem["kind"], { Icon: typeof PlusIcon; tone: string }> = {
  new: { Icon: PlusIcon, tone: "bg-[#E8F0FB] text-[#1F5A94]" },
  approved: { Icon: CheckIcon, tone: "bg-teal-100 text-teal-800" },
  rejected: { Icon: XIcon, tone: "bg-rose-50 text-rose-800" },
  grouped: { Icon: StackIcon, tone: "bg-slate-100 text-slate-700" },
};

/** Overview, Night Desk: what needs a decision, how long it has waited, and where it is. */
export default function OverviewPage() {
  const operatorKey = useManagementOperatorKey();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const since = startOfLocalDay(now);

  const reload = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const headers = { "x-demo-operator-key": operatorKey };
      const midnight = new Date(startOfLocalDay(Date.now())).toISOString();
      const [oversight, feed, incidents, photos, audit] = await Promise.all([
        fetch(`/api/v2/incident-oversight?since=${encodeURIComponent(midnight)}`, { headers, cache: "no-store" }),
        fetch("/api/v2/hazards?include=resolved", { cache: "no-store" }),
        fetch("/api/v2/incidents", { headers, cache: "no-store" }),
        fetch("/api/v2/evidence-states", { headers, cache: "no-store" }).catch(() => null),
        fetch("/api/audit", { headers, cache: "no-store" }).catch(() => null),
      ]);
      if (!oversight.ok || !feed.ok || !incidents.ok) throw Error("Check that the local server is running, then try again.");
      const a = await oversight.json() as { metrics?: OverviewMetrics; today?: Today };
      const b = await feed.json() as { reports?: Report[] };
      const c = await incidents.json() as { incidents?: Group[] };
      if (!a.metrics || !Array.isArray(b.reports) || !Array.isArray(c.incidents)) throw Error("Overview data was incomplete.");
      // Photo markers and the shift log are conveniences; the overview still loads without them.
      const p = photos?.ok ? await photos.json().catch(() => null) as { states?: Record<string, string> } | null : null;
      const log = audit?.ok ? await audit.json().catch(() => null) as { entries?: AuditLike[] } | null : null;
      // Resolved reports only name entries in the shift log; the queue, counts and map use open reports.
      const all = b.reports as (Report & { resolvedAt?: string | null })[];
      setData({ metrics: a.metrics, today: a.today ?? null, reports: all.filter(r => !r.resolvedAt), logReports: all, groups: c.incidents, audit: Array.isArray(log?.entries) ? log.entries : null, photos: p?.states ?? null });
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

  const queue = data ? decisionQueue(data.reports, CARDS, now) : null;
  const groups = data ? groupsUnderReview(data.groups, 3) : null;
  const oldest = queue?.items[0] ?? null;
  const decisions = data?.audit ? decisionsSince(data.audit, since) : null;
  const log = data ? shiftLog(data.logReports.filter(r => Date.parse(r.createdAt) >= since - 24 * 3600_000), data.audit ?? [], 4) : [];
  const startLink = queue?.oldestId ? reportLink(queue.oldestId) : "/management/incidents#report-review";
  const waitOf = useCallback((id: string) => {
    const report = data?.reports.find(r => r.id === id);
    return report && report.reviewState === "unverified" ? formatWait(report.createdAt, now) : null;
  }, [data, now]);
  const mapReports = useMemo(() => (data?.reports ?? []).filter(r => Number.isFinite(r.longitude) && Number.isFinite(r.latitude)), [data]);

  // The oldest waiting report starts selected; a choice the operator makes is kept across refreshes.
  useEffect(() => {
    if (!data) return;
    setSelectedId(current => current && data.reports.some(r => r.id === current) ? current : queue?.oldestId ?? null);
  }, [data, queue?.oldestId]);
  const select = (id: string) => {
    setSelectedId(id);
    document.getElementById(`queue-card-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const summary = error ? "Could not load the overview" : busy && !data ? "Loading the latest reports…" : data
    ? `${todayLine({ received: data.today?.received ?? null, approved: decisions?.approved ?? 0, rejected: decisions?.rejected ?? 0 })}. ${groups?.total ?? 0} ${groups?.total === 1 ? "group" : "groups"} under review.`
    : "";

  return <>
    <ManagementSectionHeading section="overview"
      eyebrow={<span className="flex items-center justify-between gap-3">{dateLine(now)}
        <Button variant="nightGhost" size="icon" onClick={() => void reload()} disabled={busy} aria-label={busy ? "Loading…" : "Refresh"} className="-my-2 sm:hidden"><ArrowClockwiseIcon size={20} aria-hidden="true" /></Button>
      </span>}
      title={queue ? reviewHeadline(queue.total) : "Overview"}
      subtitle={<p className="mt-1 text-body text-night-muted" aria-live="polite">{summary}{decisions === null && data ? <span className="sr-only"> Decision counts are unavailable.</span> : null}</p>}
      actions={<>
        {oldest ? <div className="flex flex-wrap items-center gap-4 rounded-xl border border-night-edge bg-night-raised px-4 py-3">
          <ClockIcon size={24} className="text-night-muted" aria-hidden="true" />
          <div><p className="text-small text-night-muted">Oldest report</p><p className="font-display text-title font-semibold tabular-nums text-white">{oldest.wait}</p></div>
          <div className="text-small"><p className="font-semibold text-night-text">{categoryLabel(oldest.report.category)}</p><p className="text-night-muted">waiting {waitingSince(oldest.report.createdAt, now)}</p></div>
          <Link href={startLink} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-night-mint px-5 text-body font-semibold text-night-on-mint hover:bg-white">Start reviewing</Link>
        </div> : data ? <div className="flex items-center gap-3 rounded-xl border border-night-edge bg-night-raised px-4 py-3 text-night-text">
          <CheckIcon size={20} weight="bold" className="text-night-mint" aria-hidden="true" /><span className="text-body">All caught up</span>
        </div> : null}
        <Button variant="nightGhost" size="icon" onClick={() => void reload()} disabled={busy} aria-label={busy ? "Loading…" : "Refresh"} className="hidden sm:inline-flex">
          <ArrowClockwiseIcon size={20} aria-hidden="true" />
        </Button>
      </>}
      below={data?.today ? <TodayTimeline reports={data.today.reports} since={since} now={now} selectedId={selectedId} onSelect={select} /> : null} />

    {error ? <div role="alert" className="flex max-w-2xl gap-3 rounded-xl bg-rose-50 p-4 text-small leading-5 text-rose-800">
      <WarningCircleIcon size={20} weight="bold" className="shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold text-rose-950">Could not load the overview. Nothing is shown so you don&apos;t act on out-of-date information.</p>
        <p className="mt-1">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => void reload()} className="mt-3"><ArrowClockwiseIcon size={16} aria-hidden="true" />Try again</Button>
      </div>
    </div> : null}

    {busy && !data && !error ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px] min-[1400px]:grid-cols-[minmax(0,1fr)_560px]" aria-hidden="true">
      <div className="h-80 animate-pulse rounded-xl bg-slate-100" /><div className="h-80 animate-pulse rounded-xl bg-slate-100" />
    </div> : null}

    {data && queue && groups ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px] min-[1400px]:grid-cols-[minmax(0,1fr)_560px]">
      <div className="min-w-0">
        <section aria-labelledby="needs-decision">
          <div className="mb-3 flex min-h-11 items-center gap-3">
            <h2 id="needs-decision" className="font-display text-heading font-semibold text-slate-900 sm:text-title">Needs your decision</h2>
            {queue.total ? <span className="whitespace-nowrap text-small text-slate-600">Oldest first</span> : null}
            <Link href="/management/incidents#report-review" className={cn(textLink, "ml-auto")}>All reports<CaretRightIcon size={14} weight="bold" aria-hidden="true" /></Link>
          </div>
          {queue.total === 0 ? <div className={cn(panel, "flex items-center gap-4 p-5")}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100"><CheckIcon size={24} weight="bold" className="text-teal-800" aria-hidden="true" /></span>
            <div><h3 className="text-heading font-semibold text-slate-900">All caught up</h3>
              <p className="text-body text-slate-600">No reports are waiting for review. New resident reports appear here as soon as they are sent.</p></div>
          </div> : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queue.items.map(({ report, wait }, index) => {
              const selected = report.id === selectedId;
              const hasPhoto = data.photos?.[report.id] && data.photos[report.id] !== "none";
              return <li key={report.id} id={`queue-card-${report.id}`}
                className={cn(panel, "relative flex flex-col p-4 transition-colors hover:border-slate-300", selected && "border-[#B9DCCB] bg-[#EAF6F0] shadow-[inset_4px_0_0_#0B7350] hover:border-[#B9DCCB]")}>
                {/* The whole card selects the report on the map; the link inside opens it for review. */}
                <button type="button" onClick={() => setSelectedId(report.id)} aria-pressed={selected} className="flex flex-1 flex-col items-start text-left after:absolute after:inset-0 after:rounded-xl after:content-['']">
                  <span className="flex w-full items-center gap-3">
                    <HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} size={30} decorative />
                    <time dateTime={report.createdAt} title={new Date(report.createdAt).toLocaleString()} className="font-display text-title font-semibold tabular-nums text-slate-900">{wait}</time>
                    {index === 0 ? <span className="ml-auto rounded-full bg-slate-900 px-2 text-caption font-semibold text-white">Oldest</span> : null}
                  </span>
                  <span className="ml-12 text-caption text-slate-600">waiting for review</span>
                  <strong className="mt-2 text-heading font-semibold text-slate-900">{categoryLabel(report.category)}</strong>
                  <span className="mb-3 mt-1 line-clamp-2 text-small text-slate-600">{report.description}</span>
                  <span className="mt-auto flex items-center gap-2"><SeverityChip impact={report.impact} />
                    {hasPhoto ? <span className="inline-flex items-center gap-1 text-caption text-slate-600"><CameraIcon size={14} aria-hidden="true" />Photo</span> : null}</span>
                  <span className="sr-only">{selected ? "Shown on the map" : "Show on the map"}</span>
                </button>
                <Link href={reportLink(report.id)} className={cn(textLink, "relative mt-3 self-start")}>Review report<CaretRightIcon size={14} weight="bold" aria-hidden="true" /></Link>
              </li>;
            })}
          </ul>}
          {queue.more ? <p className="mt-3 text-small text-slate-600">{queue.more} more waiting. <Link href="/management/incidents#report-review" className="font-semibold text-teal-800 hover:underline">See them in Incidents</Link></p> : null}
        </section>

        <OverviewClosures operatorKey={operatorKey} className="mt-6" />

        <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
          <section className={cn(panel, "p-4")} aria-labelledby="groups-under-review">
            <div className="mb-1 flex items-center gap-2"><h2 id="groups-under-review" className="font-display text-heading font-semibold text-slate-900">Groups under review</h2>
              <Link href="/management/incidents#incident-groups" className={cn(textLink, "ml-auto")}>All groups</Link></div>
            {groups.total === 0 ? <p className="py-2 text-small text-slate-600">No incident groups are under review</p> : <ul>
              {groups.items.map(group => <li key={group.id} className="border-t border-slate-100 first:border-0">
                <Link href={groupLink(group.id)} className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <HazardMarker category={group.category} impact={highestSeverity(group.reports.map(link => link.report.impact)).key} reviewState="unverified" size={24} decorative />
                  <span className="min-w-0 flex-1"><strong className="block truncate text-body font-semibold text-slate-900">{group.title}</strong>
                    <span className="text-caption text-slate-600">{group.reports.length} {group.reports.length === 1 ? "report" : "reports"}, opened {formatAge(group.createdAt, now)} ago</span></span>
                  <CaretRightIcon size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
                </Link>
              </li>)}
            </ul>}
            {groups.more ? <p className="pt-2 text-caption text-slate-600">{groups.more} more under review</p> : null}
          </section>

          <section className={cn(panel, "p-4")} aria-labelledby="shift-log">
            <div className="mb-1 flex items-center gap-2"><h2 id="shift-log" className="font-display text-heading font-semibold text-slate-900">Shift log</h2>
              <Link href="/management/system" className={cn(textLink, "ml-auto")}>View all activity</Link></div>
            {log.length === 0 ? <p className="py-2 text-small text-slate-600">Nothing has happened since yesterday</p> : <ol>
              {log.map(item => {
                const { Icon, tone } = LOG_ICON[item.kind];
                const body = <>
                  <time dateTime={item.at} className="w-12 shrink-0 font-display text-body font-semibold tabular-nums text-slate-700">{clockTime(item.at)}</time>
                  <span aria-hidden="true" className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone)}><Icon size={14} weight="bold" /></span>
                  <span className="min-w-0"><strong className="block text-body font-semibold text-slate-900">{item.title}</strong>
                    <span className="block truncate text-small text-slate-600">{item.detail}</span></span>
                </>;
                return <li key={item.key} className="border-t border-slate-100 first:border-0">
                  {item.reportId && item.kind !== "rejected"
                    ? <Link href={reportLink(item.reportId)} className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">{body}</Link>
                    : <div className="flex min-h-12 items-center gap-3 py-2">{body}</div>}
                </li>;
              })}
            </ol>}
            {data.audit === null ? <p className="pt-2 text-caption text-slate-600">Decisions could not be loaded; only new reports are listed</p> : null}
          </section>
        </div>
      </div>

      <section aria-labelledby="where" className="min-w-0">
        <div className="mb-3 flex min-h-11 items-center"><h2 id="where" className="font-display text-title font-semibold text-slate-900">Where</h2>
          <Link href="/management/maps" className={cn(textLink, "ml-auto")}>Open full map<CaretRightIcon size={14} weight="bold" aria-hidden="true" /></Link></div>
        <OverviewMap reports={mapReports} selectedId={selectedId} onSelect={select} wait={waitOf} reviewHref={reportLink} />
        <p className="mt-2 text-caption text-slate-600">Choose a card to find it on the map, or a pin to pick its card</p>
      </section>
    </div> : null}

    <details className={cn(panel, "group mt-6")}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-body font-semibold text-slate-900">
        <CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />Review ages and operator activity
        <span className="text-caption font-normal text-slate-600">Advanced, read-only counts</span>
      </summary>
      <div className="grid items-start gap-4 px-5 pb-5 xl:grid-cols-2"><ReviewAgeQueue operatorKey={operatorKey} /><OperatorAuditSummary operatorKey={operatorKey} /></div>
    </details>
  </>;
}
