"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { RoadFeature } from "@/lib/bbr-roads";
import { loadRoads } from "@/lib/road-loader";
import { useServiceArea } from "@/hooks/useServiceArea";
import { isInsideServiceArea } from "@/lib/service-area";
import { fitView, projectPercent, viewRoadPaths } from "@/lib/overview-map";
import { categoryLabel, reviewStateOf, severityOf, SEVERITY } from "@/lib/hazard-presentation";
import HazardMarker from "./HazardMarker";

export type MapReport = { id: string; category: string; impact: string; reviewState: string; longitude: number; latitude: number };
const W = 560, H = 560;

/**
 * Overview "Where" map (Night Desk). Every report is a pin you can pick; the picked one is ringed and
 * labelled, and the Overview cards follow the same selection. A still drawing that fits all pins:
 * for panning and zooming, "Open full map" goes to Maps.
 */
export default function OverviewMap({ reports, selectedId, onSelect, wait, reviewHref }: {
  reports: readonly MapReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Waiting time for a report still being checked, for the label. */
  wait: (id: string) => string | null;
  reviewHref: (id: string) => string;
}) {
  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  const { data: serviceArea, loaded } = useServiceArea();
  const areaId = serviceArea.area.id;
  useEffect(() => {
    if (!loaded) return; // wait for the active area, so the right road file is loaded
    let live = true;
    void loadRoads(areaId).then(result => { if (live) setRoads(result); });
    return () => { live = false; };
  }, [loaded, areaId]);
  // Only reports inside the active area are drawn, so old reports from another area do not
  // stretch the map across the country. They still appear in the decision list and in Incidents.
  const inArea = useMemo(() => reports.filter(r => isInsideServiceArea(serviceArea.area, r.longitude, r.latitude)), [reports, serviceArea.area]);
  const outside = reports.length - inArea.length;
  const view = useMemo(() => fitView(inArea, W, H), [inArea]);
  const paths = useMemo(() => (roads && view ? viewRoadPaths(roads, view) : []), [roads, view]);
  if (!view) return <div className="flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-6 text-center text-small text-slate-600">
    {outside ? `No reports inside ${serviceArea.area.name} yet. ${outside} older ${outside === 1 ? "report is" : "reports are"} outside this area and listed under Incidents.`
      : "No reports with a location yet. New reports appear here as pins."}
  </div>;

  // Waiting reports are drawn above approved ones, and the selected one above everything.
  const order = (r: MapReport) => (r.id === selectedId ? 2 : reviewStateOf(r.reviewState).needsReview ? 1 : 0);
  const pins = inArea.slice().sort((a, b) => order(a) - order(b));
  const selected = inArea.find(r => r.id === selectedId) ?? null;
  const at = selected ? projectPercent(view, selected.longitude, selected.latitude) : null;
  const selectedWait = selected ? wait(selected.id) : null;

  return <figure className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-[#E9EDEB]" aria-label="Where the reports are, on unverified OpenStreetMap road lines">
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
      {paths.map(path => <g key={path.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {path.major ? <path d={path.d} stroke="rgba(17,24,32,.38)" strokeWidth={7} /> : null}
        <path d={path.d} stroke={path.major ? "#F7F8F9" : "rgba(17,24,32,.26)"} strokeWidth={path.major ? 4 : 1.5} />
      </g>)}
    </svg>
    {pins.map(report => {
      const p = projectPercent(view, report.longitude, report.latitude);
      const isSelected = report.id === selectedId;
      const label = `${categoryLabel(report.category)}, ${severityOf(report.impact).label}, ${reviewStateOf(report.reviewState).label}`;
      return <button key={report.id} type="button" onClick={() => onSelect(report.id)} aria-pressed={isSelected} aria-label={`${label}. Select on the overview`}
        className="absolute -translate-x-1/2 -translate-y-[88%] rounded-lg transition-transform hover:scale-110 motion-reduce:transition-none"
        style={{ left: `${p.left}%`, top: `${p.top}%` }}>
        <HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} selected={isSelected} size={isSelected ? 40 : 32} decorative />
      </button>;
    })}
    {selected && at ? <div role="status" className={"pointer-events-auto absolute w-56 rounded-xl bg-white p-3 shadow-lg " + (at.left > 55 ? "-translate-x-[calc(100%+28px)]" : "translate-x-7")}
      style={{ left: `${at.left}%`, top: `clamp(8px, calc(${at.top}% - 72px), calc(100% - 128px))` }}>
      <p className="text-body font-semibold text-slate-900">{categoryLabel(selected.category)}</p>
      <p className="text-caption text-slate-600">{selectedWait ? `Waiting ${selectedWait}, ` : `${reviewStateOf(selected.reviewState).label}, `}{severityOf(selected.impact).label.toLowerCase()}</p>
      <Link href={reviewHref(selected.id)} className="mt-1 inline-flex min-h-9 items-center gap-1 text-small font-semibold text-teal-800 hover:underline">
        {selectedWait ? "Review report" : "Open report"}<CaretRightIcon size={14} weight="bold" aria-hidden="true" />
      </Link>
    </div> : null}
    <figcaption className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-white/95 px-3 py-2 text-caption text-slate-700 shadow-sm">
      {[SEVERITY.suspected_closure, SEVERITY.partial_obstruction, SEVERITY.caution].map(s => <span key={s.key} className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-[3px]" style={{ background: s.solid }} />{s.label}</span>)}
      <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-slate-900" />Outlined: needs review</span>
      {roads !== null && paths.length === 0 ? <span className="text-slate-500">Road lines not loaded</span> : null}
      {outside ? <span className="text-slate-500">{outside} outside {serviceArea.area.name} not shown</span> : null}
    </figcaption>
  </figure>;
}
