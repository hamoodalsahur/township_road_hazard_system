"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon, CaretLeftIcon, InfoIcon, MapTrifoldIcon, PlusIcon } from "@phosphor-icons/react";
import HazardMarker from "@/components/hazards/HazardMarker";
import { SeverityChip } from "@/components/hazards/HazardChips";
import { Button } from "@/components/ui/button";
import { useServiceArea } from "@/hooks/useServiceArea";
import { loadRoads } from "@/lib/road-loader";
import type { RoadFeature } from "@/lib/bbr-roads";
import { categoryLabel } from "@/lib/hazard-presentation";
import { isInsideServiceArea } from "@/lib/service-area";
import { agoLabel, residentStateLabel } from "@/lib/resident-reports";
import type { ResidentMapReport } from "./ResidentLeafletMap";

const ResidentLeafletMap = dynamic(() => import("./ResidentLeafletMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-small text-slate-600">Loading the map…</div>,
});

type PublicReport = ResidentMapReport & { description: string; createdAt: string; hasApprovedPhoto?: boolean };

/** Resident map (roadmap 4.3, mockups 8 and 9): the reports in the area, newest first, with the map beside them. */
export default function ResidentMapPage() {
  const { data: serviceArea, loaded } = useServiceArea();
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [reports, setReports] = useState<PublicReport[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    let live = true;
    void loadRoads(serviceArea.area.id).then(result => { if (live) setRoads(result); });
    return () => { live = false; };
  }, [loaded, serviceArea.area.id]);

  const loadReports = useCallback(() => {
    setFailed(false);
    fetch("/api/v2/hazards", { cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error("unavailable"); return response.json() as Promise<{ reports: PublicReport[] }>; })
      .then(data => setReports(data.reports))
      .catch(() => { setFailed(true); setReports(current => current ?? []); });
  }, []);
  useEffect(() => { loadReports(); }, [loadReports]);

  // Only reports inside the active area, newest first. Rejected reports never reach this page (the API leaves them out).
  const inArea = useMemo(() => (reports ?? [])
    .filter(r => isInsideServiceArea(serviceArea.area, r.longitude, r.latitude))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [reports, serviceArea.area]);
  const selected = inArea.find(r => r.id === selectedId) ?? null;
  // A pin picked on the map brings its card into view in the list.
  useEffect(() => { if (selectedId) document.getElementById(`report-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [selectedId]);
  const count = inArea.length;
  const countLine = `${count} ${count === 1 ? "report" : "reports"} in ${serviceArea.area.name}`;

  const legend = <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-slate-700">
    <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border-[3px] border-slate-900 bg-white" />Being checked</span>
    <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-slate-900" />Confirmed</span>
    <span>Colour shows how bad it is</span>
  </div>;

  const list = reports === null
    ? <p className="p-4 text-body text-slate-600" role="status">Loading reports…</p>
    : failed
      ? <div className="m-4 rounded-xl border border-slate-200 bg-white p-4" role="alert">
          <p className="text-body font-semibold">Reports could not be loaded.</p>
          <p className="mt-1 text-small text-slate-600">Check that the app is running, then try again.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={loadReports}><ArrowClockwiseIcon size={16} aria-hidden="true" />Try again</Button>
        </div>
      : count === 0
        ? <div className="m-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-body font-semibold">Nothing reported in {serviceArea.area.name} right now.</p>
            <p className="mt-1 text-small text-slate-600">Seen a flood, a fallen tree or a blocked road? Tell the township team.</p>
          </div>
        : <ul className="flex flex-col gap-2 p-3 lg:p-4" aria-label="Reports on the map">
            {inArea.map(report => {
              const isSelected = report.id === selectedId;
              return <li key={report.id} id={`report-${report.id}`} className="scroll-m-3">
                <button type="button" onClick={() => setSelectedId(isSelected ? null : report.id)} aria-pressed={isSelected}
                  className={"flex w-full gap-3 rounded-xl border p-3 text-left transition-colors " +
                    (isSelected ? "border-[#B9DCCB] bg-[#EAF6F0] shadow-[inset_4px_0_0_#0B7350]" : "border-slate-200 bg-white hover:border-slate-300")}>
                  <HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} size={30} decorative />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold">{categoryLabel(report.category)}</span>
                    <span className={"mt-0.5 block text-small text-slate-600 " + (isSelected ? "" : "line-clamp-2")}>{report.description}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-small text-slate-600">
                      <SeverityChip impact={report.impact} />{residentStateLabel(report.reviewState)} · {agoLabel(report.createdAt)}
                    </span>
                    {isSelected && report.hasApprovedPhoto ? <img src={`/api/v2/hazards/${encodeURIComponent(report.id)}/evidence/approved`}
                      alt={`Photo of the ${categoryLabel(report.category).toLowerCase()}, approved by the township team`} loading="lazy"
                      className="mt-3 max-h-56 w-full rounded-lg object-cover" /> : null}
                  </span>
                </button>
              </li>;
            })}
          </ul>;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-59px)] lg:flex-none lg:flex-row">
      {/* Map: fills the phone screen above the sheet; fills the left side on desktop. */}
      <div className="relative h-[calc(100dvh-56px-4rem-env(safe-area-inset-bottom))] lg:h-auto lg:flex-1">
        <ResidentLeafletMap area={serviceArea} roads={roads} reports={inArea} selectedId={selectedId} onSelect={id => setSelectedId(id)} sheet
          label={`Map of ${serviceArea.area.name} with fictional road reports`} />
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start gap-2 lg:inset-x-5 lg:top-5">
          <span className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full bg-night px-3 text-small text-night-text shadow-lg">
            <MapTrifoldIcon size={16} className="text-night-mint" aria-hidden="true" />{serviceArea.area.name}
          </span>
          <button type="button" onClick={() => setLegendOpen(v => !v)} aria-expanded={legendOpen}
            className="pointer-events-auto ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-small font-medium shadow-sm lg:hidden">
            <InfoIcon size={16} aria-hidden="true" />What the pins mean
          </button>
        </div>
        {legendOpen ? <div className="absolute inset-x-3 top-14 z-[500] rounded-xl border border-slate-200 bg-white p-3 shadow-lg lg:hidden">{legend}</div> : null}
        <div className="absolute bottom-5 left-5 z-[500] hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:block">{legend}</div>
        {/* Phones: the main action floats above the sheet. */}
        <Link href="/resident/report" className="absolute bottom-[calc(min(44%,340px)+12px)] right-4 z-[500] inline-flex h-[52px] items-center gap-2 rounded-full bg-[#0B7350] px-5 text-body font-semibold text-white shadow-lg lg:hidden">
          <PlusIcon size={18} weight="bold" aria-hidden="true" />Report a problem
        </Link>
      </div>

      {/* Phones: a sheet over the bottom of the map. Desktop: the side panel. */}
      <aside aria-label="On the map now"
        className="absolute inset-x-0 bottom-0 z-[600] flex max-h-[min(44%,340px)] flex-col rounded-t-3xl bg-slate-50 shadow-[0_-14px_30px_-18px_rgba(14,23,32,.5)]
          lg:static lg:max-h-none lg:w-[440px] lg:rounded-none lg:border-l lg:border-slate-200 lg:shadow-none">
        <div className="shrink-0 rounded-t-3xl bg-white px-4 pb-2 pt-2 lg:rounded-none lg:bg-night lg:px-6 lg:pb-5 lg:pt-5 lg:text-night-text">
          <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
          {selected ? <button type="button" onClick={() => setSelectedId(null)} className="mb-1 inline-flex items-center gap-1 text-small font-medium text-[#0B7350] lg:text-night-mint">
            <CaretLeftIcon size={14} aria-hidden="true" />All reports</button> : null}
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-heading font-semibold lg:text-display">On the map now</h1>
            <span className="ml-auto text-small text-slate-600 lg:hidden">{count} {count === 1 ? "report" : "reports"}</span>
          </div>
          <p className="mt-1 hidden text-body text-night-muted lg:block">{countLine}. Pins with a ring are still being checked.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{list}
          <p className="px-4 pb-4 text-caption text-slate-600 lg:px-6">Fictional demo reports. They are not live road conditions and are not directions.</p>
        </div>
        <div className="hidden shrink-0 border-t border-slate-200 bg-white p-4 lg:block">
          <Button asChild variant="approve" className="h-12 w-full text-body"><Link href="/resident/report"><PlusIcon size={18} weight="bold" aria-hidden="true" />Report a problem</Link></Button>
        </div>
      </aside>
    </div>
  );
}
