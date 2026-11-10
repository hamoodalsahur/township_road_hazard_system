"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { validRoadCollection, type RoadFeature } from "@/lib/bbr-roads";
import { filterRoads, roadCategory, type RoadFilter } from "@/lib/bbr-road-display";
import { MapPinned, ExternalLink } from "lucide-react";
import { bbrReferencePoints } from "@/lib/bbr-reference";
import { reviewSmallGroups } from "@/lib/bbr-small-groups";
import { roadReviewFlags } from "@/lib/bbr-road-review-flags";
import {reviewedDemoVicinityStrokes,DEMO_IMPACT_LEGEND,type ReviewedDemoReport} from "@/lib/v215-road-vicinity";
import { inspectOsmNodeTopology } from "@/lib/bbr-osm-topology";
import { CATEGORY_LABELS, DEMO_HAZARDS, HAZARD_CATEGORIES, filterDemoHazards, type HazardCategory } from "@/lib/demo-hazards";
import { HAZARD_SYMBOLS } from "@/lib/hazard-symbols";
import { prepareDemoPhoto } from "@/lib/demo-photo-client";
import {inspectDemoReportDraft} from "@/lib/v213-report-draft";
import {useServiceArea} from "@/hooks/useServiceArea";

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
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [roadMessage, setRoadMessage] = useState("Checking for locally imported roads…");
  const [filter, setFilter] = useState<RoadFilter>("all");
  const [groupNumber, setGroupNumber] = useState(0);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [hazardCategory, setHazardCategory] = useState<HazardCategory | "all">("all");
  const [showExampleHazards, setShowExampleHazards] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [storedHazards, setStoredHazards] = useState<typeof DEMO_HAZARDS>([]);
  const [hazardError, setHazardError] = useState("");
  const [draftPosition, setDraftPosition] = useState<[number,number] | null>(null);
  const [reportCategory, setReportCategory] = useState<HazardCategory>("fallen_tree");
  const [reportImpact, setReportImpact] = useState("unknown");
  const [reportDescription, setReportDescription] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [photoInputKey,setPhotoInputKey] = useState(0);
  const [reportPhase,setReportPhase] = useState<"idle"|"saving"|"attaching">("idle");
  const serviceArea=useServiceArea().data;
  const hints=inspectDemoReportDraft(reportDescription,draftPosition,evidenceFile,serviceArea.area);
  const [photoApprovedIds, setPhotoApprovedIds] = useState<string[]>([]);
  const [reviewedReports,setReviewedReports]=useState<ReviewedDemoReport[]>([]);
  const [showVicinityStrokes,setShowVicinityStrokes]=useState(true);
  async function loadStoredHazards() {
    try {
      const response=await fetch("/api/v2/hazards",{cache:"no-store"});
      if(!response.ok) throw Error("Fictional report feed unavailable; check the existing local connection without resetting your database.");
      const payload=await response.json() as {reports:{id:string;category:HazardCategory;description:string;longitude:number;latitude:number;impact:string;reviewState:string;createdAt:string;hasApprovedPhoto:boolean}[]};
      setPhotoApprovedIds(payload.reports.filter(item=>item.hasApprovedPhoto).map(item=>item.id));
      setReviewedReports(payload.reports.map(item=>({
        id:item.id,longitude:item.longitude,latitude:item.latitude,impact:item.impact as ReviewedDemoReport["impact"],
        reviewState:item.reviewState
      })));
      setStoredHazards(payload.reports.map(item=>({
        id:item.id,category:item.category,title:CATEGORY_LABELS[item.category]+" (submitted demo)",
        description:item.description,coordinates:[item.longitude,item.latitude],
        impact:item.impact as typeof DEMO_HAZARDS[number]["impact"],
        reportedAt:item.createdAt,status:"fictional_unverified",sourceMode:"simulation"
      })));
      setHazardError("");
    } catch(e){setHazardError(e instanceof Error?e.message:"Could not load demo reports");}
  }
  useEffect(()=>{
    void loadStoredHazards();
    const listener=()=>{void loadStoredHazards();};
    window.addEventListener("township-hazards-updated",listener);
    return ()=>window.removeEventListener("township-hazards-updated",listener);
  },[]);
  // Submitted reports appear by default; four authored example pins are opt-in.
  // Rejected submissions remain in the review queue but not the operational map.
  const rejectedIds=new Set(reviewedReports.filter(item=>item.reviewState==="rejected").map(item=>item.id));
  const submittedMapHazards=storedHazards.filter(item=>!rejectedIds.has(item.id));
  const allHazards=[...submittedMapHazards,...(showExampleHazards?DEMO_HAZARDS:[])];
  const visibleHazards=filterDemoHazards(hazardCategory,allHazards);
  const selectedHazard = allHazards.find(hazard => hazard.id === selectedHazardId) ?? null;
  async function submitDemoHazard() {
    if(!hints.canSubmit||!draftPosition){
      setReportMessage(hints.locationError??hints.descriptionError??hints.photoError??"Complete the fictional report form.");
      return;
    }
    setSendingReport(true);setReportPhase("saving");setReportMessage("");
    try {
      const response=await fetch("/api/v2/hazards",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({category:reportCategory,impact:reportImpact,description:reportDescription,coordinates:draftPosition})
      });
      const result=await response.json() as {error?:string;report?:{id:string}};
      if(!response.ok)throw Error(result.error??"Report not saved");
      let photoNote = "";
      if(evidenceFile && result.report?.id) {
        setReportPhase("attaching");
        try {
          const encoded = await prepareDemoPhoto(evidenceFile);
          const upload=await fetch(`/api/v2/hazards/${result.report.id}/evidence`,{
            method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(encoded)
          });
          if(!upload.ok) {
            const failure=await upload.json() as {error?:string};
            throw Error(failure.error??"Photo upload failed");
          }
          photoNote=" Private demo photo attached for operator review.";
        } catch (photoError) {
          photoNote=" Report saved, but photo could not be attached: "+(photoError instanceof Error?photoError.message:"unknown issue");
        }
      }
      setReportDescription("");setDraftPosition(null);setEvidenceFile(null);setPhotoInputKey(x=>x+1);
      setReportMessage("Fictional incident submitted. No road closure created."+photoNote);
      window.dispatchEvent(new Event("township-hazards-updated"));
      await loadStoredHazards();
    } catch(e){setReportMessage(e instanceof Error?e.message:"Unable to submit demo hazard");}
    finally{setSendingReport(false);setReportPhase("idle");}
  }

  useEffect(() => {
    let active = true;
    fetch("/data/bbr-roads.geojson", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Road file unavailable");
        const data: unknown = await response.json();
        if (!validRoadCollection(data)) throw new Error("Road file failed validation");
        if (active) {
          setRoads(data.features);
          setRoadMessage(data.features.length
            ? `${data.features.length} OSM mapped road lines imported (unverified, not a connected graph).`
            : "No road lines imported yet. Run npm run geo:import locally.");
        }
      }).catch(() => { if (active) setRoadMessage("Road file missing or invalid; showing reference points only."); });
    return () => { active = false; };
  }, []);

  const smallGroups = useMemo(() => reviewSmallGroups({ type: "FeatureCollection", features: roads }).smallerGroups, [roads]);
  const topology = useMemo(() => inspectOsmNodeTopology({ type: "FeatureCollection", features: roads }), [roads]);
  const selectedNode = topology.reviewExamples.find(item => item.nodeId === selectedNodeId) ?? null;
  const selectedNodePosition = selectedNode ? selectedNode.coordinate.split(",").map(Number) as [number, number] : null;
  const activeGroup = smallGroups.find(group => group.groupNumber === groupNumber);
  const visibleRoads = useMemo(() => {
    const byCategory = filterRoads(roads, filter);
    if (!activeGroup) return byCategory;
    const ids = new Set(activeGroup.ways.map(road => road.id));
    return byCategory.filter(road => ids.has(road.properties.id));
  }, [roads, filter, activeGroup]);
  const vicinityStrokes=useMemo(()=>reviewedDemoVicinityStrokes(roads,reviewedReports,serviceArea.area),[roads,reviewedReports,serviceArea.area]);
  const selectedRoad = roads.find(road => road.properties.id === selectedRoadId) ?? null;
  const reviewFlags = selectedRoad ? roadReviewFlags(selectedRoad) : [];
  const counts = useMemo(() => ({
    major: filterRoads(roads, "major").length,
    local: filterRoads(roads, "local").length,
    service: filterRoads(roads, "service").length,
    other: filterRoads(roads, "other").length,
  }), [roads]);

  return (
    <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_-45px_rgba(15,41,55,.45)] sm:p-6" aria-label="BBR geographic reference map">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-teal-800"><MapPinned size={18} aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[.14em]">Interactive area map</p></div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Bandar Bukit Raja · Incident map</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Explore fictional report markers and BBR roads. Select a marker for details or a line for road-reference information.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"><span className="h-2 w-2 rounded-full bg-amber-500"/> Unverified map data</span>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
        <label className="block text-sm font-semibold">
          Show road category
          <select value={filter} onChange={event => { setFilter(event.target.value as RoadFilter); setSelectedRoadId(null); setSelectedNodeId(null); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500">
            {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </label>
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Advanced road groups</summary>
          <label className="mt-2 block text-sm font-semibold">
          Inspect candidate group
          <select value={groupNumber} onChange={event => { setGroupNumber(Number(event.target.value)); setFilter("all"); setSelectedRoadId(null); setSelectedNodeId(null); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value={0}>All imported roads</option>
            {smallGroups.map(group => <option key={group.groupNumber} value={group.groupNumber}>Group {group.groupNumber} ({group.roadLineCount} lines)</option>)}
          </select>
          </label>
        </details>
        <p className="text-sm text-slate-600">{visibleRoads.length} lines displayed · {roads.length} imported</p>
      </div>
      <details className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3" aria-label="Demonstration road colour legend"><summary className="cursor-pointer text-sm font-semibold text-blue-950">Road overlay details and legend</summary><div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-blue-950">Blue road hierarchy · unverified OSM reference</p>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={showVicinityStrokes} onChange={event=>setShowVicinityStrokes(event.target.checked)}/>
            Show human-reviewed fictional report vicinity colors
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-blue-950">
          {[["#2563eb","Main roads"],["#60a5fa","Local streets"],["#93c5fd","Service"],["#bfdbfe","Other"]].map(([color,label])=>
            <span key={label} className="inline-flex items-center gap-2"><span aria-hidden="true" style={{background:color}} className="inline-block h-1.5 w-7 rounded-full"/>{label}</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-amber-950">
          {DEMO_IMPACT_LEGEND.map(item=><span key={item.impact} className="inline-flex items-center gap-2">
            <span aria-hidden="true" style={{background:item.color}} className="inline-block h-1.5 w-7 rounded-full"/>{item.label}
          </span>)}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-700">Colored dashed sections indicate approximate vicinity of corroborated <strong>fictional</strong> reports, not road closures or traffic status. Pending/rejected reports never recolor roads. Ambiguous nearby road matches are deliberately excluded. {vicinityStrokes.length} example vicinity overlay(s) identified.</p>
      </div></details>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
        <div>
          <p className="text-sm font-bold text-orange-950">Submitted incident markers</p>
          <p className="text-xs text-orange-900">Reports in this local demo; rejected reports are excluded. Not verified road conditions.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-orange-950">
          <input type="checkbox" checked={showExampleHazards} onChange={event => { setShowExampleHazards(event.target.checked); setSelectedHazardId(null); }} /> Include 4 built-in examples
        </label>
        <label className="text-xs font-semibold text-slate-700">Hazard type
          <select value={hazardCategory} onChange={event => { setHazardCategory(event.target.value as HazardCategory | "all"); setSelectedHazardId(null); }}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="all">All hazard types</option>
            {HAZARD_CATEGORIES.map(category => <option value={category} key={category}>{CATEGORY_LABELS[category]}</option>)}
          </select>
        </label>
        <span className="text-xs font-medium text-slate-600">{visibleHazards.length} map marker(s) · {submittedMapHazards.length} submitted{showExampleHazards?" + 4 examples":""}</span>
      </div>
      <details className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Category shortcuts</summary><div className="mt-3 flex flex-wrap gap-2" aria-label="Hazard marker legend">
        {HAZARD_CATEGORIES.map(category => (
          <button type="button" key={category} onClick={() => { setHazardCategory(category); setSelectedHazardId(null); }}
            aria-pressed={hazardCategory === category}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${hazardCategory === category ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"}`}>
            <span aria-hidden="true">{HAZARD_SYMBOLS[category].symbol}</span>{CATEGORY_LABELS[category]}
          </button>
        ))}
        {hazardCategory !== "all" ? <button type="button" onClick={() => setHazardCategory("all")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">Show all</button> : null}
      </div></details>
      <details className="mt-3 rounded-xl border border-teal-200 bg-teal-50/50" id="report-demo-hazard">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-teal-900">Submit a fictional report · Choose a position on the map below</summary>
        <div className="grid gap-3 border-t border-teal-100 p-4 sm:grid-cols-2">
          <p className="rounded-lg bg-white p-3 text-xs leading-5 text-teal-950 sm:col-span-2">Step 1: Click a fictional location on the map below. Step 2: Describe a made-up issue. Step 3: Submit for separate operator review. No real road closure is created.</p>
          <label className="text-sm font-semibold">Hazard category
            <select value={reportCategory} onChange={e=>setReportCategory(e.target.value as HazardCategory)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2">
              {HAZARD_CATEGORIES.map(c=><option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Suspected road impact
            <select value={reportImpact} onChange={e=>setReportImpact(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="unknown">Not sure</option><option value="caution">Caution</option>
              <option value="partial_obstruction">Partially blocked</option><option value="suspected_closure">Possibly closed (unverified)</option>
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Fictional report description
            <textarea value={reportDescription} maxLength={400} rows={3} onChange={e=>{setReportDescription(e.target.value);setReportMessage("");}} placeholder="Describe the made-up road issue (8–400 characters)." aria-describedby="demo-description-help" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
            <span id="demo-description-help" className={"mt-1 block text-xs font-normal "+(reportDescription.length>0&&hints.descriptionError?"text-rose-800":"text-slate-500")}>{reportDescription.trim().length}/400 characters{reportDescription.length>0&&hints.descriptionError?" · "+hints.descriptionError:""}</span>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Optional demonstration photo (JPEG/PNG, max 5 MB before processing)
            <input key={photoInputKey} type="file" accept="image/jpeg,image/png" onChange={e=>{setEvidenceFile(e.target.files?.[0]??null);setReportMessage("");}}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs" />
            <span className="mt-1 block text-xs font-normal leading-5 text-slate-600">Processed to a small JPEG without original EXIF metadata. Private to local management; never shown on the public map. Use fictional/sample images without identifiable people.</span>
            {hints.photoError?<span role="alert" className="mt-1 block text-xs font-semibold text-rose-800">{hints.photoError}</span>:null}
            {evidenceFile&&!hints.photoError?<span className="mt-1 block text-xs text-teal-800">Selected: {evidenceFile.name} · {(evidenceFile.size/1_000_000).toFixed(2)} MB (private until reviewed).</span>:null}
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <p className="text-xs text-slate-600">{draftPosition && !hints.locationError ? `Selected demo coordinate: ${draftPosition[1].toFixed(5)}, ${draftPosition[0].toFixed(5)}` : hints.locationError}</p>
            <button type="button" disabled={sendingReport||!hints.canSubmit} onClick={()=>void submitDemoHazard()} className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{reportPhase==="saving"?"Saving fictional report…":reportPhase==="attaching"?"Attaching private sample…":"Submit fictional report"}</button>
          </div>
          {reportMessage?<p role="status" className="text-sm text-teal-900 sm:col-span-2">{reportMessage}</p>:null}
        </div>
      </details>
      {hazardError?<p role="status" className="mt-2 text-xs text-amber-900">{hazardError}</p>:null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <GeographicReferenceMap serviceArea={serviceArea} roads={visibleRoads} vicinityStrokes={showVicinityStrokes?vicinityStrokes.filter(s=>visibleRoads.some(road=>road.properties.id===s.wayId)):[]} selectedRoadId={selectedRoadId} onSelectRoad={id => { setSelectedRoadId(id); setSelectedHazardId(null); }} focusGroup={groupNumber} selectedNodePosition={selectedNodePosition} hazards={visibleHazards} approvedPhotoIds={photoApprovedIds} onSelectHazard={id => { setSelectedHazardId(id); setSelectedRoadId(null); }} selectedHazardId={selectedHazardId} selectedLocation={draftPosition} onChooseLocation={position=>{setDraftPosition(position);setReportMessage("");}} />
        <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm" aria-live="polite">
          {activeGroup ? <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-900">Group {activeGroup.groupNumber}: {activeGroup.roadLineCount} mapped lines. Grouping is geometric only, not proof of disconnected roads.</p> : null}
          {selectedHazard ? (
            <div className="mb-4 space-y-2 rounded-xl border border-orange-200 bg-white p-3">
              <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase text-orange-950">Fictional / unverified</span>
              <h3 className="text-base font-bold"><span className="mr-2" aria-hidden="true">{HAZARD_SYMBOLS[selectedHazard.category].symbol}</span>{selectedHazard.title}</h3>
              <p className="text-xs font-semibold text-slate-600">{CATEGORY_LABELS[selectedHazard.category]} · {selectedHazard.impact.replaceAll("_"," ")}</p>
              <p className="text-sm leading-5">{selectedHazard.description}</p>
              {photoApprovedIds.includes(selectedHazard.id) ? <div className="rounded-xl border border-teal-200 bg-teal-50 p-2"><img src={`/api/v2/hazards/${selectedHazard.id}/evidence/approved`} alt={`Operator-approved fictional evidence for ${CATEGORY_LABELS[selectedHazard.category]}`} loading="lazy" className="max-h-64 w-full rounded-lg object-contain" /><p className="mt-2 text-xs font-semibold text-teal-900">Operator-approved sample image · fictional report, not verification of road conditions</p></div> : null}
              <p className="text-xs text-slate-500">{selectedHazard.id.startsWith("demo-")?"Built-in fictional example.":"Submitted fictional report."} No verified road access impact.</p>
              <button type="button" onClick={() => setSelectedHazardId(null)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold">Close details</button>
            </div>
          ) : null}
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Road details</h3>
          {selectedRoad ? (
            <div className="mt-3 space-y-2">
              <p className="break-words font-semibold">{selectedRoad.properties.name}</p>
              <p>OSM type: <span className="font-medium">{selectedRoad.properties.highway.replaceAll("_", " ")}</span></p>
              <p>Category: {roadCategory(selectedRoad.properties.highway)}</p>
              <p className="text-xs text-amber-900">Blue means OSM road type only; dashed orange/red nearby sections are fictional report-vicinity indicators and do not establish that this road is blocked.</p>
              {reviewFlags.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <h4 className="font-semibold text-amber-950">Mapped tags to review</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-950">
                    {reviewFlags.map(flag => <li key={flag.code}>{flag.label}</li>)}
                  </ul>
                  <p className="mt-2 text-xs text-amber-900">Review flags are based on unverified OSM tags, not actual road availability or flood safety.</p>
                </div>
              ) : <p className="text-xs text-slate-600">No review flags from the selected tags. Other restrictions may still exist.</p>}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h4 className="font-semibold">Mapped road attributes</h4>
                <dl className="mt-2 space-y-1 text-xs">
                  {(["oneway", "access", "bridge", "tunnel", "layer", "motor_vehicle", "junction"] as const).map(tag => (
                    <div key={tag} className="flex justify-between gap-3">
                      <dt className="text-slate-600">{tag.replaceAll("_", " ")}</dt>
                      <dd className="break-words text-right font-medium">{selectedRoad.properties[tag] ?? "Not recorded"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-amber-900">OSM values are unverified. Missing tags do not mean unrestricted access or safe conditions.</p>
              </div>
              <p className="text-slate-600">Verification: mapped by OSM contributors; not independently checked.</p>
              <a href={selectedRoad.properties.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-semibold text-teal-700 underline">Inspect OSM way <ExternalLink size={14}/></a>
              <button type="button" className="block rounded-lg border px-3 py-1 text-xs" onClick={() => setSelectedRoadId(null)}>Clear selection</button>
            </div>
          ) : <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4"><MapPinned size={21} className="text-teal-700" aria-hidden="true" /><p className="mt-3 font-semibold text-slate-800">Select a road to explore</p><p className="mt-1 text-sm leading-6 text-slate-600">Click any road line on the map to see its name, mapped attributes and original source.</p></div>}
          <hr className="my-4 border-slate-200"/>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mapped categories</h4>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li>Major: {counts.major}</li>
            <li>Local: {counts.local}</li>
            <li>Service: {counts.service}</li>
            <li>Other: {counts.other}</li>
          </ul>
        </aside>
      </div>
      <details className="group mt-4 rounded-xl border border-slate-200 bg-slate-50/80">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-teal-600">Advanced research · Node topology and source inspection <span className="ml-1 text-xs font-normal text-slate-500">(expand)</span></summary>
        <div className="border-t border-slate-200 p-4" aria-label="OSM source node inspection">
        <h3 className="font-semibold">Source-node topology inspection</h3>
        {topology.status === "missing_node_ids" ? (
          <p className="mt-2 text-sm text-slate-600">This imported file does not include original OSM node IDs. Back up the GeoJSON and refresh it using the upgraded importer to enable node-based inspection. Coordinate grouping alone is not proof of road access.</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-600">Research only · source node references on {topology.waysWithNodeIds} of {topology.roadLines} road lines. {topology.waysWithoutNodeIds > 0 ? "Partial source coverage: unmatched ways are not assessed." : "All imported ways have source node IDs."}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div><dt className="text-slate-500">Shared OSM nodes</dt><dd className="text-lg font-semibold">{topology.sharedOsmNodes}</dd></div>
              <div><dt className="text-slate-500">Candidate groups</dt><dd className="text-lg font-semibold">{topology.candidateWayGroups}</dd></div>
              <div><dt className="text-slate-500">Coordinate collisions</dt><dd className="text-lg font-semibold">{topology.coordinateCollisionLocations}</dd></div>
              <div><dt className="text-slate-500">Review flags</dt><dd className="text-lg font-semibold">{topology.flaggedSharedNodes}</dd></div>
            </dl>
            {topology.reviewExamples.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-sm font-semibold">
                  Inspect flagged OSM node
                  <select value={selectedNodeId ?? ""} onChange={event => {
                    const id = Number(event.target.value);
                    setSelectedNodeId(event.target.value ? id : null);
                    setGroupNumber(0); setFilter("all"); setSelectedRoadId(null);
                  }} className="mt-1 block max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                    <option value="">Choose source node</option>
                    {topology.reviewExamples.slice(0, 30).map(item =>
                      <option key={item.nodeId} value={item.nodeId}>Node {item.nodeId} · {item.reasons[0]}</option>
                    )}
                  </select>
                </label>
                {selectedNode ? (
                  <div className="text-xs text-slate-700">
                    <p>Mapped ways: {selectedNode.wayIds.join(", ")}</p>
                    <p>Review: {selectedNode.reasons.join("; ")}</p>
                    <a href={selectedNode.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 underline">View OSM node source</a>
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 text-xs text-amber-900">Shared source node IDs indicate OSM data relationships only. They do not verify turns, accessibility, road safety or live flooding. The map remains separate from the demonstration scenario.</p>
          </>
        )}
      </div>
      </details>
      <p role="status" className="mt-3 text-xs text-slate-500">{roadMessage}</p>
      <p className="mt-3 text-xs text-slate-600">Map data © OpenStreetMap contributors. The background tiles require internet access; line data comes from your imported GeoJSON file.</p>
      <details className="mt-3 rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reference points, attribution and source links <span className="ml-1 text-xs font-normal text-slate-500">(expand)</span></summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-2">
        {bbrReferencePoints.features.map(feature => (
          <article key={feature.properties.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <h4 className="font-semibold">{feature.properties.name}</h4>
            <p className="mt-1 text-slate-600">{feature.properties.evidence}</p>
            <p className="mt-1 text-xs text-slate-500">WGS84: {feature.geometry.coordinates[1]}, {feature.geometry.coordinates[0]}</p>
            <a className="mt-2 inline-flex items-center gap-1 font-semibold text-teal-700 underline"
              href={feature.properties.sourceUrl} target="_blank" rel="noopener noreferrer">View mapped source <ExternalLink size={13}/></a>
          </article>
        ))}
      </div>
      </details>
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-950"><strong>Geographic reference only.</strong> This OSM layer is not an official township boundary or verified connected network, and cannot establish actual flood conditions, road access or safe directions. The simulation below uses separate fictional data.</p>
    </section>
  );
}
