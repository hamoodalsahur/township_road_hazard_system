"use client";

import dynamic from "next/dynamic";
import { type RoadFilter } from "@/lib/bbr-road-display";
import {DEMO_IMPACT_LEGEND} from "@/lib/v215-road-vicinity";
import { CATEGORY_LABELS, HAZARD_CATEGORIES, type HazardCategory } from "@/lib/demo-hazards";
import { HAZARD_SYMBOLS } from "@/lib/hazard-symbols";
import { useMapWorkspace } from "@/hooks/useMapWorkspace";
import { MapResearchSections, RoadDetails } from "./MapSharedSections";

const GeographicReferenceMap = dynamic(() => import("./GeographicReferenceMap"), {
  ssr: false,
  loading: () => <div className="flex h-[340px] items-center justify-center rounded-xl bg-slate-100 text-slate-600">Loading geographic map…</div>,
});

const categories: { value: RoadFilter; label: string }[] = [
  { value: "all", label: "All roads" },
  { value: "major", label: "Major roads" },
  { value: "local", label: "Local streets" },
  { value: "service", label: "Service roads" },
  { value: "other", label: "Other" },
];

export default function GeographicReferenceWorkspace() {
  const ws = useMapWorkspace();
  const {
    roads, roadMessage, filter, setFilter, groupNumber, setGroupNumber, selectedRoadId, setSelectedRoadId, selectedNodeId, setSelectedNodeId,
    hazardCategory, setHazardCategory, showExampleHazards, setShowExampleHazards, selectedHazardId, setSelectedHazardId,
    draftPosition, setDraftPosition, reportCategory, setReportCategory, reportImpact, setReportImpact,
    reportDescription, setReportDescription, sendingReport, reportMessage, setReportMessage, evidenceFile, setEvidenceFile, photoInputKey, setPhotoInputKey,
    reportPhase, serviceArea, hints, photoApprovedIds, showVicinityStrokes, setShowVicinityStrokes,
    submittedMapHazards, visibleHazards, selectedHazard, submitDemoHazard,
    smallGroups, topology, selectedNode, selectedNodePosition, activeGroup, visibleRoads, vicinityStrokes, selectedRoad, reviewFlags, counts,
    hazardError, reviewStates,
  } = ws;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="BBR geographic reference map">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-title font-semibold text-slate-900">{serviceArea.area.name}</h2>
          <p className="mt-2 max-w-3xl text-small leading-6 text-slate-600">Explore fictional report markers and BBR roads. Select a marker for details or a line for road-reference information.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-caption font-medium text-slate-700"><span className="h-2 w-2 rounded-full bg-slate-500"/> Unverified map data</span>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
        <label className="block text-small font-semibold">
          Show road category
          <select value={filter} onChange={event => { setFilter(event.target.value as RoadFilter); setSelectedRoadId(null); setSelectedNodeId(null); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-small shadow-sm focus:border-slate-200">
            {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </label>
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-small font-semibold">Advanced road groups</summary>
          <label className="mt-2 block text-small font-semibold">
          Inspect candidate group
          <select value={groupNumber} onChange={event => { setGroupNumber(Number(event.target.value)); setFilter("all"); setSelectedRoadId(null); setSelectedNodeId(null); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value={0}>All imported roads</option>
            {smallGroups.map(group => <option key={group.groupNumber} value={group.groupNumber}>Group {group.groupNumber} ({group.roadLineCount} lines)</option>)}
          </select>
          </label>
        </details>
        <p className="text-small text-slate-600">{visibleRoads.length} lines displayed · {roads.length} imported</p>
      </div>
      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Demonstration road colour legend"><summary className="cursor-pointer text-small font-semibold text-slate-900">Road overlay details and legend</summary><div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small font-semibold text-slate-900">Blue road hierarchy · unverified OSM reference</p>
          <label className="flex items-center gap-2 text-caption font-semibold text-slate-700">
            <input type="checkbox" checked={showVicinityStrokes} onChange={event=>setShowVicinityStrokes(event.target.checked)}/>
            Show human-reviewed fictional report vicinity colors
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-caption text-slate-900">
          {[["#2563eb","Main roads"],["#60a5fa","Local streets"],["#93c5fd","Service"],["#bfdbfe","Other"]].map(([color,label])=>
            <span key={label} className="inline-flex items-center gap-2"><span aria-hidden="true" style={{background:color}} className="inline-block h-1.5 w-7 rounded-full"/>{label}</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-caption text-slate-900">
          {DEMO_IMPACT_LEGEND.map(item=><span key={item.impact} className="inline-flex items-center gap-2">
            <span aria-hidden="true" style={{background:item.color}} className="inline-block h-1.5 w-7 rounded-full"/>{item.label}
          </span>)}
        </div>
        <p className="mt-2 text-caption leading-5 text-slate-700">Colored dashed sections indicate approximate vicinity of corroborated <strong>fictional</strong> reports, not road closures or traffic status. Pending/rejected reports never recolor roads. Ambiguous nearby road matches are deliberately excluded. {vicinityStrokes.length} example vicinity overlay(s) identified.</p>
      </div></details>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div>
          <p className="text-small font-semibold text-slate-900">Submitted incident markers</p>
          <p className="text-caption text-slate-900">Reports in this local demo; rejected reports are excluded. Not verified road conditions.</p>
        </div>
        <label className="flex items-center gap-2 text-caption font-semibold text-slate-900">
          <input type="checkbox" checked={showExampleHazards} onChange={event => { setShowExampleHazards(event.target.checked); setSelectedHazardId(null); }} /> Include 4 built-in examples
        </label>
        <label className="text-caption font-semibold text-slate-700">Hazard type
          <select value={hazardCategory} onChange={event => { setHazardCategory(event.target.value as HazardCategory | "all"); setSelectedHazardId(null); }}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="all">All hazard types</option>
            {HAZARD_CATEGORIES.map(category => <option value={category} key={category}>{CATEGORY_LABELS[category]}</option>)}
          </select>
        </label>
        <span className="text-caption font-medium text-slate-600">{visibleHazards.length} map marker(s) · {submittedMapHazards.length} submitted{showExampleHazards?" + 4 examples":""}</span>
      </div>
      <details className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><summary className="cursor-pointer text-caption font-semibold text-slate-700">Category shortcuts</summary><div className="mt-3 flex flex-wrap gap-2" aria-label="Hazard marker legend">
        {HAZARD_CATEGORIES.map(category => (
          <button type="button" key={category} onClick={() => { setHazardCategory(category); setSelectedHazardId(null); }}
            aria-pressed={hazardCategory === category}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-caption font-semibold transition ${hazardCategory === category ? "border-slate-200 bg-slate-50 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-200"}`}>
            <span aria-hidden="true">{HAZARD_SYMBOLS[category].symbol}</span>{CATEGORY_LABELS[category]}
          </button>
        ))}
        {hazardCategory !== "all" ? <button type="button" onClick={() => setHazardCategory("all")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-caption font-semibold">Show all</button> : null}
      </div></details>
      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50" id="report-demo-hazard">
        <summary className="cursor-pointer px-4 py-3 text-small font-semibold text-slate-900">Submit a fictional report · Choose a position on the map below</summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
          <p className="rounded-lg bg-white p-3 text-caption leading-5 text-slate-900 sm:col-span-2">Step 1: Click a fictional location on the map below. Step 2: Describe a made-up issue. Step 3: Submit for separate operator review. No real road closure is created.</p>
          <label className="text-small font-semibold">Hazard category
            <select value={reportCategory} onChange={e=>setReportCategory(e.target.value as HazardCategory)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2">
              {HAZARD_CATEGORIES.map(c=><option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="text-small font-semibold">Suspected road impact
            <select value={reportImpact} onChange={e=>setReportImpact(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="unknown">Not sure</option><option value="caution">Caution</option>
              <option value="partial_obstruction">Partially blocked</option><option value="suspected_closure">Possibly closed (unverified)</option>
            </select>
          </label>
          <label className="text-small font-semibold sm:col-span-2">Fictional report description
            <textarea value={reportDescription} maxLength={400} rows={3} onChange={e=>{setReportDescription(e.target.value);setReportMessage("");}} placeholder="Describe the made-up road issue (8–400 characters)." aria-describedby="demo-description-help" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
            <span id="demo-description-help" className={"mt-1 block text-caption font-normal "+(reportDescription.length>0&&hints.descriptionError?"text-rose-800":"text-slate-500")}>{reportDescription.trim().length}/400 characters{reportDescription.length>0&&hints.descriptionError?" · "+hints.descriptionError:""}</span>
          </label>
          <label className="text-small font-semibold sm:col-span-2">Optional demonstration photo (JPEG/PNG, max 5 MB before processing)
            <input key={photoInputKey} type="file" accept="image/jpeg,image/png" onChange={e=>{setEvidenceFile(e.target.files?.[0]??null);setReportMessage("");}}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-caption" />
            <span className="mt-1 block text-caption font-normal leading-5 text-slate-600">Processed to a small JPEG without original EXIF metadata. Private to local management; never shown on the public map. Use fictional/sample images without identifiable people.</span>
            {hints.photoError?<span role="alert" className="mt-1 block text-caption font-semibold text-rose-800">{hints.photoError}</span>:null}
            {evidenceFile&&!hints.photoError?<span className="mt-1 block text-caption text-teal-800">Selected: {evidenceFile.name} · {(evidenceFile.size/1_000_000).toFixed(2)} MB (private until reviewed).</span>:null}
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <p className="text-caption text-slate-600">{draftPosition && !hints.locationError ? `Selected demo coordinate: ${draftPosition[1].toFixed(5)}, ${draftPosition[0].toFixed(5)}` : hints.locationError}</p>
            <button type="button" disabled={sendingReport||!hints.canSubmit} onClick={()=>void submitDemoHazard()} className="rounded-lg bg-night px-5 py-3 text-body font-semibold text-white disabled:opacity-40">{reportPhase==="saving"?"Saving fictional report…":reportPhase==="attaching"?"Attaching private sample…":"Submit fictional report"}</button>
          </div>
          {reportMessage?<p role="status" className="text-small text-slate-900 sm:col-span-2">{reportMessage}</p>:null}
        </div>
      </details>
      {hazardError?<p role="status" className="mt-2 text-caption text-slate-900">{hazardError}</p>:null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <GeographicReferenceMap serviceArea={serviceArea} roads={visibleRoads} vicinityStrokes={showVicinityStrokes?vicinityStrokes.filter(s=>visibleRoads.some(road=>road.properties.id===s.wayId)):[]} selectedRoadId={selectedRoadId} onSelectRoad={id => { setSelectedRoadId(id); setSelectedHazardId(null); }} focusGroup={groupNumber} selectedNodePosition={selectedNodePosition} hazards={visibleHazards} approvedPhotoIds={photoApprovedIds} onSelectHazard={id => { setSelectedHazardId(id); setSelectedRoadId(null); }} selectedHazardId={selectedHazardId} selectedLocation={draftPosition} onChooseLocation={position=>{setDraftPosition(position);setReportMessage("");}} reviewStates={reviewStates} />
        <aside className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-small" aria-live="polite">
          {activeGroup ? <p className="mb-3 rounded-lg bg-slate-50 p-2 text-caption font-medium text-slate-900">Group {activeGroup.groupNumber}: {activeGroup.roadLineCount} mapped lines. Grouping is geometric only, not proof of disconnected roads.</p> : null}
          {selectedHazard ? (
            <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-caption font-semibold text-slate-900">Fictional / unverified</span>
              <h3 className="text-body font-semibold"><span className="mr-2" aria-hidden="true">{HAZARD_SYMBOLS[selectedHazard.category].symbol}</span>{selectedHazard.title}</h3>
              <p className="text-caption font-semibold text-slate-600">{CATEGORY_LABELS[selectedHazard.category]} · {selectedHazard.impact.replaceAll("_"," ")}</p>
              <p className="text-small leading-5">{selectedHazard.description}</p>
              {photoApprovedIds.includes(selectedHazard.id) ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-2"><img src={`/api/v2/hazards/${selectedHazard.id}/evidence/approved`} alt={`Operator-approved fictional evidence for ${CATEGORY_LABELS[selectedHazard.category]}`} loading="lazy" className="max-h-64 w-full rounded-lg object-contain" /><p className="mt-2 text-caption font-semibold text-slate-900">Operator-approved sample image · fictional report, not verification of road conditions</p></div> : null}
              <p className="text-caption text-slate-500">{selectedHazard.id.startsWith("demo-")?"Built-in fictional example.":"Submitted fictional report."} No verified road access impact.</p>
              <button type="button" onClick={() => setSelectedHazardId(null)} className="rounded-lg border border-slate-200 px-3 py-1 text-caption font-semibold">Close details</button>
            </div>
          ) : null}
          <h3 className="text-caption font-semibold text-slate-500">Road details</h3>
          <RoadDetails ws={ws} />
          <hr className="my-4 border-slate-200"/>
          <h4 className="text-caption font-semibold text-slate-500">Mapped categories</h4>
          <ul className="mt-2 space-y-1 text-caption text-slate-600">
            <li>Major: {counts.major}</li>
            <li>Local: {counts.local}</li>
            <li>Service: {counts.service}</li>
            <li>Other: {counts.other}</li>
          </ul>
        </aside>
      </div>
      <MapResearchSections ws={ws} />
      <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-caption leading-5 text-slate-900"><strong>Geographic reference only.</strong> This OSM layer is not an official township boundary or verified connected network, and cannot establish actual flood conditions, road access or safe directions. The simulation below uses separate fictional data.</p>
    </section>
  );
}
