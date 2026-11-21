"use client";
import {useState} from "react";
type Metrics={roadLines:number;waysWithNodes:number;waysMissingNodes:number;totalSegments:number;zeroLengthSegments:number;repeatedNodePairs:number;duplicateWayIds:number;coordinateConflicts:number;isolatedWays:number;largestComponentWays:number;componentCount:number;disclaimer:string};
export default function RoadTopologyQuality({operatorKey}:{operatorKey:string}){
 const [result,setResult]=useState<Metrics|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function inspect(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/v2/road-topology-quality",{headers:{"x-demo-operator-key":operatorKey},cache:"no-store"});
   const data=await response.json() as {metrics?:Metrics;error?:string};
   if(!response.ok||!data.metrics)throw Error(data.error||"Unable to inspect imported roads");
   setResult(data.metrics);
  }catch(e){setError(e instanceof Error?e.message:"Topology inspection failed");}finally{setBusy(false);}
 }
 const rows=result?[["Road lines",result.roadLines],["Lines with OSM node IDs",result.waysWithNodes],["Missing node IDs",result.waysMissingNodes],["Candidate components",result.componentCount],["Largest component (ways)",result.largestComponentWays],["Isolated ways",result.isolatedWays],["Zero-length segments",result.zeroLengthSegments],["Repeated adjacent node IDs",result.repeatedNodePairs],["Duplicate way IDs",result.duplicateWayIds],["Node-coordinate conflicts",result.coordinateConflicts]] as const:[];
 return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5" aria-label="OSM topology quality review">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="mt-1 text-heading font-semibold">OSM topology consistency</h2></div><button type="button" disabled={busy} onClick={()=>void inspect()} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-small font-semibold text-slate-900 hover:border-slate-300 disabled:opacity-50">{busy?"Checking…":"Inspect road geometry"}</button></div>
  <p className="mt-2 text-small text-slate-600">Read-only checks on the locally imported BBR road file. Connected OSM ways do not establish travel routes or road safety.</p>
  {error?<p role="alert" className="mt-3 text-caption text-rose-800">{error}</p>:null}
  {result?<div className="mt-4 space-y-3">
   <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{rows.map(([label,value])=><div key={label} className="rounded-lg bg-slate-100 p-3"><p className="text-caption text-slate-600">{label}</p><p className="mt-1 text-heading font-semibold">{value}</p></div>)}</div>
   <p className="rounded-lg bg-slate-100 p-3 text-caption leading-5 text-slate-700">{result.disclaimer}</p>
   {result.waysMissingNodes===result.roadLines&&result.roadLines>0?<p className="text-caption font-semibold text-slate-700">Original OSM node IDs are missing; shared-node connectivity cannot be assessed from this file.</p>:null}
  </div>:null}
 </section>;
}
