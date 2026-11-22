"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PlusIcon, StackIcon, XIcon } from "@phosphor-icons/react";
import { useMapWorkspace } from "@/hooks/useMapWorkspace";
import { CATEGORY_LABELS, HAZARD_CATEGORIES, type HazardCategory } from "@/lib/demo-hazards";
import type { RoadFilter } from "@/lib/bbr-road-display";
import { DEMO_IMPACT_LEGEND } from "@/lib/v215-road-vicinity";
import { categoryLabel, formatAgeLong } from "@/lib/hazard-presentation";
import type { PinPoint } from "@/lib/map-platform";
import MapLegend from "./MapLegend";
import { reportLink } from "@/lib/overview-queue";
import { mapStageCounts, stageHazards } from "@/lib/map-stage";
import HazardMarker from "@/components/hazards/HazardMarker";
import { ReviewStateChip, SeverityChip } from "@/components/hazards/HazardChips";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapResearchSections, RoadDetails } from "./MapSharedSections";

const GeographicReferenceMap = dynamic(() => import("./GeographicReferenceMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-small text-slate-600">Loading the map…</div>,
});

const ROAD_FILTERS: { value: RoadFilter; label: string }[] = [
  { value: "all", label: "All roads" }, { value: "major", label: "Major roads" }, { value: "local", label: "Local streets" },
  { value: "service", label: "Service roads" }, { value: "other", label: "Other" },
];
const IMPACTS = [
  { value: "unknown", label: "Not sure" }, { value: "caution", label: "Take care" },
  { value: "partial_obstruction", label: "Partly blocked" }, { value: "suspected_closure", label: "Possibly closed" },
];
const select = "h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-body text-slate-900";

/** One labelled on/off row in the layers panel. */
function Toggle({ id, checked, onChange, label, count, swatch }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string; count?: number; swatch?: React.ReactNode }) {
  return <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-body text-slate-900">
    <Checkbox id={id} checked={checked} onCheckedChange={value => onChange(value === true)} />
    {swatch}<span className="flex-1">{label}</span>{count !== undefined ? <span className="font-semibold tabular-nums text-slate-700">{count}</span> : null}
  </label>;
}

/**
 * Management Maps, Night Desk (roadmap 4.1 / 4.2b step 4b): the map fills the screen, with a layers panel
 * on the left, details of the selected report or road on the right, and the legend along the bottom.
 * On phones the panels sit under the map instead of over it. All data and rules come from useMapWorkspace,
 * shared with the resident page's map.
 */
export default function ManagementMapStage() {
  const ws = useMapWorkspace();
  const {
    roads, filter, setFilter, groupNumber, setGroupNumber, setSelectedRoadId, setSelectedNodeId, hazardCategory, setHazardCategory,
    showExampleHazards, setShowExampleHazards, selectedHazardId, setSelectedHazardId, draftPosition, setDraftPosition,
    reportCategory, setReportCategory, reportImpact, setReportImpact, reportDescription, setReportDescription, sendingReport,
    reportMessage, setReportMessage, evidenceFile, setEvidenceFile, photoInputKey, reportPhase, serviceArea, hints, photoApprovedIds,
    showVicinityStrokes, setShowVicinityStrokes, submittedMapHazards, visibleHazards, selectedHazard, submitDemoHazard, smallGroups,
    selectedNodePosition, activeGroup, visibleRoads, vicinityStrokes, selectedRoad, reviewStates, hazardError,
  } = ws;
  const [showWaiting, setShowWaiting] = useState(true);
  const [showApproved, setShowApproved] = useState(true);
  const [reporting, setReporting] = useState(false);
  // Road-inspection mode (DESIGN.md section 10): Positron already shows roads, so our own lines are drawn only on request.
  const [inspectRoads, setInspectRoads] = useState(false);
  const [onScreen, setOnScreen] = useState<PinPoint[]>([]);
  const [now] = useState(() => Date.now());

  const shown = useMemo(() => stageHazards(visibleHazards, reviewStates, { waiting: showWaiting, approved: showApproved }), [visibleHazards, reviewStates, showWaiting, showApproved]);
  const counts = useMemo(() => mapStageCounts(submittedMapHazards, reviewStates), [submittedMapHazards, reviewStates]);
  const selectedState = selectedHazard ? reviewStates[selectedHazard.id] ?? "unverified" : null;
  const isExample = selectedHazard?.id.startsWith("demo-") ?? false;
  const roadsShown = visibleRoads.length;

  function startReport() { setReporting(true); setSelectedHazardId(null); setSelectedRoadId(null); setReportMessage(""); }
  function stopReport() { setReporting(false); setDraftPosition(null); }

  const detail = selectedHazard ? <section aria-label="Selected report" className="space-y-3">
    <div className="flex items-start gap-3">
      <HazardMarker category={selectedHazard.category} impact={selectedHazard.impact} reviewState={selectedState ?? "unverified"} size={40} decorative />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-title font-semibold text-slate-900">{categoryLabel(selectedHazard.category)}</h2>
        <p className="text-small text-slate-600">{isExample ? "Built-in example" : `Reported ${formatAgeLong(selectedHazard.reportedAt, now)}`}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setSelectedHazardId(null)} aria-label="Close report details" className="-mr-2 -mt-2"><XIcon size={20} aria-hidden="true" /></Button>
    </div>
    <div className="flex flex-wrap gap-2"><SeverityChip impact={selectedHazard.impact} />{isExample ? null : <ReviewStateChip reviewState={selectedState ?? "unverified"} />}</div>
    <p className="text-body text-slate-900">{selectedHazard.description}</p>
    {photoApprovedIds.includes(selectedHazard.id) ? <figure className="overflow-hidden rounded-xl bg-slate-100">
      <img src={`/api/v2/hazards/${encodeURIComponent(selectedHazard.id)}/evidence/approved`} alt={`Approved photo for the ${categoryLabel(selectedHazard.category).toLowerCase()} report`} loading="lazy" className="max-h-56 w-full object-contain" />
      <figcaption className="px-3 py-2 text-caption text-slate-600">Approved photo, also shown to residents</figcaption>
    </figure> : null}
    <p className="text-caption text-slate-600">Fictional report. Its position is illustrative and no road closure is confirmed.</p>
    {isExample ? null : <Button asChild variant={selectedState === "unverified" ? "primary" : "secondary"} className="w-full">
      <Link href={reportLink(selectedHazard.id)}>{selectedState === "unverified" ? "Review this report" : "Open the report"}<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></Link>
    </Button>}
  </section> : selectedRoad ? <section aria-label="Selected road" className="text-small">
    <div className="flex items-center justify-between"><h2 className="font-display text-heading font-semibold text-slate-900">Road details</h2>
      <Button variant="ghost" size="icon" onClick={() => setSelectedRoadId(null)} aria-label="Close road details" className="-mr-2"><XIcon size={20} aria-hidden="true" /></Button></div>
    <RoadDetails ws={ws} />
  </section> : null;

  const reportForm = <section aria-label="Add a fictional report" className="space-y-4">
    <p className="text-small text-slate-600">It goes to the review queue like a resident report. No road closure is created.</p>
    <p className={cn("rounded-lg px-3 py-2 text-small", draftPosition && !hints.locationError ? "bg-teal-100 text-teal-900" : "bg-[#E8F0FB] text-[#1F5A94]")}>
      {draftPosition && !hints.locationError ? `Placed at ${draftPosition[1].toFixed(5)}, ${draftPosition[0].toFixed(5)}. Click again to move it.` : hints.locationError ?? "Click the map to place the report."}
    </p>
    <label className="block text-small font-semibold text-slate-900">Type of problem
      <select value={reportCategory} onChange={e => setReportCategory(e.target.value as HazardCategory)} className={cn(select, "mt-1")}>
        {HAZARD_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </select>
    </label>
    <label className="block text-small font-semibold text-slate-900">Can cars get through?
      <select value={reportImpact} onChange={e => setReportImpact(e.target.value)} className={cn(select, "mt-1")}>
        {IMPACTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>
    </label>
    <label className="block text-small font-semibold text-slate-900">What did you see?
      <textarea value={reportDescription} maxLength={400} rows={3} onChange={e => { setReportDescription(e.target.value); setReportMessage(""); }}
        placeholder="Describe the made-up problem, 8 to 400 characters" aria-describedby="stage-description-help"
        className="mt-1 block w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-body font-normal text-slate-900 placeholder:text-slate-500" />
      <span id="stage-description-help" className={"mt-1 block text-caption font-normal " + (reportDescription.length > 0 && hints.descriptionError ? "text-rose-800" : "text-slate-600")}>
        {reportDescription.trim().length}/400{reportDescription.length > 0 && hints.descriptionError ? `. ${hints.descriptionError}` : ""}</span>
    </label>
    <label className="block text-small font-semibold text-slate-900">Photo (optional)
      <Input key={photoInputKey} type="file" accept="image/jpeg,image/png" onChange={e => { setEvidenceFile(e.target.files?.[0] ?? null); setReportMessage(""); }} className="mt-1 h-auto py-2 text-small" />
      <span className="mt-1 block text-caption font-normal text-slate-600">JPEG or PNG. Stored small and without location data, private until an operator approves it.</span>
      {hints.photoError ? <span role="alert" className="mt-1 block text-caption text-rose-800">{hints.photoError}</span> : null}
    </label>
    <Button className="w-full" disabled={sendingReport || !hints.canSubmit} onClick={() => void submitDemoHazard()}>
      {reportPhase === "saving" ? "Saving…" : reportPhase === "attaching" ? "Attaching the photo…" : "Send for review"}
    </Button>
    {reportMessage ? <p role="status" className="text-small text-slate-900">{reportMessage}</p> : null}
  </section>;

  const layers = <div className="space-y-5">
    <section aria-labelledby="layer-reports">
      <h2 id="layer-reports" className="mb-1 text-small font-semibold text-slate-600">Reports</h2>
      <Toggle id="layer-waiting" checked={showWaiting} onChange={setShowWaiting} label="Needs review" count={counts.waiting}
        swatch={<span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-slate-900" />} />
      <Toggle id="layer-approved" checked={showApproved} onChange={setShowApproved} label="Approved" count={counts.approved}
        swatch={<span aria-hidden="true" className="h-3 w-3 rounded-full bg-slate-900" />} />
      <Toggle id="layer-examples" checked={showExampleHazards} onChange={value => { setShowExampleHazards(value); setSelectedHazardId(null); }} label="Built-in examples" count={4} />
      <label className="mt-2 block text-small font-semibold text-slate-900">Type
        <select value={hazardCategory} onChange={e => { setHazardCategory(e.target.value as HazardCategory | "all"); setSelectedHazardId(null); }} className={cn(select, "mt-1")}>
          <option value="all">All types</option>
          {HAZARD_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </label>
    </section>
    <section aria-labelledby="layer-roads">
      <h2 id="layer-roads" className="mb-1 text-small font-semibold text-slate-600">Roads</h2>
      <Toggle id="layer-road-lines" checked={inspectRoads} onChange={value => { setInspectRoads(value); if (!value) { setSelectedRoadId(null); setGroupNumber(0); } }}
        label="Inspect road lines" count={inspectRoads ? roadsShown : undefined}
        swatch={<span aria-hidden="true" className="h-1 w-5 rounded-full bg-slate-800" />} />
      {inspectRoads ? <><label className="block text-small font-semibold text-slate-900">Show
        <select value={filter} onChange={e => { setFilter(e.target.value as RoadFilter); setSelectedRoadId(null); setSelectedNodeId(null); }} className={cn(select, "mt-1")}>
          {ROAD_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </label>
      </> : null}
      <Toggle id="layer-vicinity" checked={showVicinityStrokes} onChange={setShowVicinityStrokes} label="Near approved reports" count={vicinityStrokes.length}
        swatch={<span aria-hidden="true" className="h-1 w-5 rounded-full" style={{ background: "repeating-linear-gradient(90deg,#B9480F 0 6px,transparent 6px 9px)" }} />} />
      <p className="text-caption text-slate-600">{inspectRoads ? `${roadsShown.toLocaleString()} of ${roads.length.toLocaleString()} road lines shown` : `${roads.length.toLocaleString()} road lines available. The background map already shows every road.`}</p>
      {inspectRoads && smallGroups.length ? <details className="group mt-2">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-small font-semibold text-slate-700"><CaretRightIcon size={14} className="transition-transform group-open:rotate-90" aria-hidden="true" />Road groups (advanced)</summary>
        <select value={groupNumber} onChange={e => { setGroupNumber(Number(e.target.value)); setFilter("all"); setSelectedRoadId(null); setSelectedNodeId(null); }} className={cn(select, "mt-1")} aria-label="Road group to inspect">
          <option value={0}>All imported roads</option>
          {smallGroups.map(group => <option key={group.groupNumber} value={group.groupNumber}>Group {group.groupNumber} ({group.roadLineCount} lines)</option>)}
        </select>
        {activeGroup ? <p className="mt-2 text-caption text-slate-600">Grouping is geometric only, not proof of disconnected roads</p> : null}
      </details> : null}
    </section>
  </div>;

  return <>
    {/* Phones: map, then the selected item, then layers. Wide screens: panels float over the map. */}
    <div className="relative -mx-4 -mt-6 flex flex-col sm:-mx-8 lg:block">
      <div className="relative order-1 h-[62svh] min-h-[420px] lg:h-[max(560px,calc(100svh-13.5rem))]">
        <GeographicReferenceMap serviceArea={serviceArea} roads={inspectRoads ? visibleRoads : []} onVisibleChange={setOnScreen}
          vicinityStrokes={showVicinityStrokes ? vicinityStrokes.filter(s => visibleRoads.some(road => road.properties.id === s.wayId)) : []}
          selectedRoadId={ws.selectedRoadId} onSelectRoad={id => { if (reporting) return; setSelectedRoadId(id); setSelectedHazardId(null); }}
          focusGroup={groupNumber} selectedNodePosition={selectedNodePosition} hazards={shown}
          onSelectHazard={id => { if (reporting) return; setSelectedHazardId(id); setSelectedRoadId(null); }} selectedHazardId={selectedHazardId}
          selectedLocation={reporting ? draftPosition : null} reviewStates={reviewStates}
          onChooseLocation={reporting ? position => { setDraftPosition(position); setReportMessage(""); } : undefined} />
      </div>

      {/* Layers (or the report form). Floats over the map on wide screens, sits under it on phones. */}
      <aside aria-label={reporting ? "Add a fictional report" : "Map layers"}
        className="order-3 z-10 flex flex-col overflow-hidden border-b border-slate-200 bg-white lg:absolute lg:bottom-20 lg:left-6 lg:top-6 lg:w-[320px] lg:rounded-xl lg:border-0 lg:shadow-[0_16px_36px_-18px_rgba(14,23,32,.55)]">
        <div className="flex items-center gap-3 bg-night px-5 py-4 text-night-text">
          <div className="min-w-0 flex-1">
            <p className="font-display text-heading font-semibold">{reporting ? "Add a fictional report" : "Layers"}</p>
            <p className="text-small text-night-muted">{reporting ? "Click the map to place it" : `${shown.length} ${shown.length === 1 ? "report" : "reports"} on the map`}</p>
          </div>
          {reporting
            ? <Button variant="nightGhost" size="sm" onClick={stopReport}><CaretLeftIcon size={16} aria-hidden="true" />Cancel</Button>
            : <Button variant="night" size="sm" onClick={startReport}><PlusIcon size={16} weight="bold" aria-hidden="true" />Add report</Button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{reporting ? reportForm : layers}</div>
      </aside>

      {detail ? <aside aria-live="polite" className="order-2 z-10 overflow-y-auto border-b border-slate-200 bg-white p-5 lg:absolute lg:right-6 lg:top-6 lg:max-h-[calc(100%-8rem)] lg:w-[340px] lg:rounded-xl lg:border-0 lg:shadow-[0_16px_36px_-18px_rgba(14,23,32,.55)]">
        {detail}
      </aside> : null}

      {/* Legend: only what is on screen (roadmap 3.2). */}
      <div className="z-10 hidden flex-wrap items-center gap-x-4 gap-y-1 rounded-full bg-white px-4 py-2 shadow-[0_8px_20px_-14px_rgba(14,23,32,.5)] lg:absolute lg:bottom-6 lg:left-6 lg:flex">
        <MapLegend visible={onScreen} audience="operator" />
        <span className="text-caption text-slate-500">Roads: OpenStreetMap, not verified</span>
      </div>
    </div>

    {hazardError ? <p role="status" className="mt-4 text-small text-rose-800">{hazardError}</p> : null}
    <details className="group mt-6 rounded-xl border border-slate-200 bg-white" aria-label="Road colours and report vicinity">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-body font-semibold text-slate-900">
        <CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" /><StackIcon size={20} aria-hidden="true" />Road colours and report vicinity
      </summary>
      <div className="space-y-3 px-5 pb-5 text-small text-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-caption">
          {[[3, "Main roads"], [2, "Local streets"], [1, "Service and other"]].map(([weight, label]) =>
            <span key={label} className="inline-flex items-center gap-2"><span aria-hidden="true" style={{ height: Number(weight) + 1 }} className="inline-block w-7 rounded-full bg-slate-800" />{label}</span>)}
          {DEMO_IMPACT_LEGEND.map(item => <span key={item.impact} className="inline-flex items-center gap-2"><span aria-hidden="true" style={{ background: item.color }} className="inline-block h-1 w-7 rounded-full" />{item.label}</span>)}
        </div>
        <p>With "Inspect road lines" on, our imported lines are drawn in dark grey, thicker for bigger roads, and the selected road in green. They show the OpenStreetMap road type only. Coloured dashed sections mark the rough vicinity of <strong>approved fictional</strong> reports, not closures or traffic. Reports waiting or rejected never colour a road, and unclear matches are left out.</p>
      </div>
    </details>
    <MapResearchSections ws={ws} />
    <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-caption leading-5 text-slate-700"><strong>Geographic reference only.</strong> This OSM layer is not an official township boundary or a verified connected network, and cannot establish actual flood conditions, road access or safe directions.</p>
  </>;
}
