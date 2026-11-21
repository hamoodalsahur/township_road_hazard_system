"use client";
import {useState} from "react";
import type {EvidenceInventory as Metrics} from "@/lib/v2-evidence-inventory";

export default function EvidenceInventory({operatorKey}:{operatorKey:string}){
 const [metrics,setMetrics]=useState<Metrics|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function refresh(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/v2/evidence-inventory",{headers:{"x-demo-operator-key":operatorKey},cache:"no-store"});
   const data=await response.json() as {metrics?:Metrics;error?:string};
   if(!response.ok||!data.metrics)throw Error(data.error||"Evidence inventory unavailable");
   setMetrics(data.metrics);
  }catch(e){setError(e instanceof Error?e.message:"Unable to inspect demo evidence");}
  finally{setBusy(false);}
 }
 const rows=metrics?([
  ["Evidence records",metrics.totalEvidence],
  ["Private · unreviewed",metrics.privateUnreviewed],
  ["Approved for public demo",metrics.approvedPublicDemo],
  ["Kept private · rejected",metrics.privateRejected],
  ["Unrecognised status",metrics.unknownState],
  ["All evidence over 30 days",metrics.overThirtyDays],
  ["Private evidence over 30 days",metrics.privateOverThirtyDays],
  ["Approved evidence over 30 days",metrics.approvedOverThirtyDays]
 ] as const):[];
 return <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Private evidence inventory">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="font-display text-heading font-semibold">Private evidence inventory</h2></div>
   <button type="button" onClick={()=>void refresh()} disabled={busy}
     className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-small font-semibold text-slate-900 hover:border-slate-300 disabled:opacity-50">
     {busy?"Loading…":"Inspect privacy inventory"}</button>
  </div>
  <p className="mt-2 text-small text-slate-600">Read-only aggregate counts. No photographs, report descriptions, coordinates or private notes are returned. This is not an automatic retention or deletion policy.</p>
  {error?<p role="alert" className="mt-2 text-small text-rose-800">{error}</p>:null}
  {metrics?<div className="mt-4 space-y-3">
   <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {rows.map(([label,count])=><div key={label} className="rounded-lg bg-slate-100 p-3">
     <p className="text-caption text-slate-600">{label}</p>
     <p className="font-display text-heading font-semibold">{count}</p>
    </div>)}
   </div>
   <p className="text-caption text-slate-700">Stored image payload size (original decoded bytes): {metrics.storedPayloadBytes.toLocaleString()} bytes. No image content was loaded for this calculation.</p>
   <p className="rounded-lg bg-slate-100 p-3 text-caption leading-5 text-slate-700">{metrics.disclaimer}</p>
  </div>:null}
 </section>;
}
