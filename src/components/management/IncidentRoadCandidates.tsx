"use client";
import {useState} from "react";
type Candidate={id:string;name:string;highway:string;sourceUrl:string;distanceMetres:number;verification:string;sourceReview:{oneway:string|null;access:string|null;motorVehicle:string|null;bridge:string|null;tunnel:string|null;layer:string|null;originalNodeIdsPresent:boolean;reviewNotes:string[]};observationSummary:{eligibleReportLocations:number;nearbyReportLocations:number;approximateClosestMetres:number|null;approximateFarthestNearbyMetres:number|null;duplicateOsmWayId:boolean;disclaimer:string}};
type Result={candidates:Candidate[];reportLocations:number;roadFeaturesScanned:number;disclaimer:string};
export default function IncidentRoadCandidates({id,operatorKey}:{id:string;operatorKey:string}){
 const [data,setData]=useState<Result|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function inspect(){
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/v2/incidents/"+id+"/road-candidates",{headers:{"x-demo-operator-key":operatorKey},cache:"no-store"});
   const payload=await res.json() as Result&{error?:string};
   if(!res.ok)throw Error(payload.error||"Road comparison unavailable");
   setData(payload);
  }catch(e){setError(e instanceof Error?e.message:"Road comparison failed");}
  finally{setBusy(false);}
 }
 return <section className="mt-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div><p className="text-[13px] text-slate-600">Read-only comparison with unverified OpenStreetMap lines. It does not update road conditions.</p></div>
   <button type="button" disabled={busy} onClick={()=>void inspect()} className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-[inset_0_0_0_1px_#E6E9E7] hover:bg-slate-50 disabled:opacity-50">{busy?"Checking…":"Inspect nearby road lines"}</button>
  </div>
  {error?<p role="alert" className="mt-2 text-xs text-rose-900">{error}</p>:null}
  {data?<div className="mt-3 space-y-2">
   <p className="text-xs font-semibold text-slate-900">Compared {data.reportLocations} fictional report locations against {data.roadFeaturesScanned} locally imported OSM road lines.</p>
   {data.candidates.length===0?<p className="text-xs">No mapped road lines found within 150 m of the available report points.</p>:null}
   <ul className="space-y-2">{data.candidates.map(road=><li key={road.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
    <strong>{road.name}</strong> · {road.highway.replaceAll("_"," ")} · approximately {road.distanceMetres} m from a report
    <p className="mt-1"><a href={road.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline">View original OSM way</a> · {road.id} · unverified geometry</p>
    <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
      <p className="font-semibold">Nearby fictional location observations (not independent corroboration)</p>
      <p className="mt-1">{road.observationSummary.nearbyReportLocations} of {road.observationSummary.eligibleReportLocations} eligible fictional report locations within approximately 150 m of this unverified OSM line.</p>
      {road.observationSummary.approximateClosestMetres!==null?<p className="mt-1">Approximate observed distance range: {road.observationSummary.approximateClosestMetres}–{road.observationSummary.approximateFarthestNearbyMetres} m</p>:null}
      {road.observationSummary.duplicateOsmWayId?<p className="mt-1 font-semibold text-rose-800">Duplicate OSM way ID detected; observations suppressed pending source review.</p>:null}
      <p className="mt-1 text-slate-900">{road.observationSummary.disclaimer}</p>
    </div>
    <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
      <p className="font-semibold">Unverified source-tag review · no road impact decision</p>
      <p className="mt-1">Original OSM nodes: {road.sourceReview.originalNodeIdsPresent?"present (still unverified)":"not preserved / unknown"}</p>
      <p className="mt-1">Raw OSM tags (absence means unknown):
        {([
          ["oneway",road.sourceReview.oneway],["access",road.sourceReview.access],
          ["motor_vehicle",road.sourceReview.motorVehicle],["bridge",road.sourceReview.bridge],
          ["tunnel",road.sourceReview.tunnel],["layer",road.sourceReview.layer]
        ] as const).filter(([,value])=>value!==null).map(([label,value])=><span key={label} className="ml-2 inline-block">{label}={value}</span>)}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">{road.sourceReview.reviewNotes.map(note=><li key={note}>{note}</li>)}</ul>
    </div>
   </li>)}</ul>
   <p className="text-xs leading-5 text-slate-900">{data.disclaimer}</p>
  </div>:null}
 </section>;
}
