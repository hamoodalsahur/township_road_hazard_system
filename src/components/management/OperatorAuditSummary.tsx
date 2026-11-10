"use client";
import {useState} from "react";
import type {DemoAuditSummary} from "@/lib/v2-demo-audit-summary";
export default function OperatorAuditSummary({operatorKey}:{operatorKey:string}){
 const [metrics,setMetrics]=useState<DemoAuditSummary|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function load(){
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/v2/operator-audit-summary",{
    headers:{"x-demo-operator-key":operatorKey},cache:"no-store"
   });
   const data=await res.json() as {metrics?:DemoAuditSummary;error?:string};
   if(!res.ok||!data.metrics)throw Error(data.error||"Activity summary unavailable");
   setMetrics(data.metrics);
  }catch(e){setError(e instanceof Error?e.message:"Could not load activity summary");}
  finally{setBusy(false);}
 }
 const figures=metrics?([
  ["Total fictional actions",metrics.totalActions],
  ["Last 24 hours",metrics.last24Hours],
  ["Last 7 days",metrics.last7Days],
  ["Incident-management events",metrics.incidentManagementActions],
  ["Geographic review events",metrics.geographicReviewActions],
  ["Scenario or road-demo events",metrics.scenarioOrRoadDemoActions],
  ["Other demo events",metrics.otherDemoActions],
  ["Future or invalid timestamps",metrics.invalidOrFutureTimestamps]
 ] as const):[];
 return <section className="rounded-2xl bg-slate-50 p-5" aria-label="Fictional operator activity summary">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <p className="text-[13px] font-semibold text-slate-500">Audit visibility · demonstration only</p>
    <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Operator activity overview</h2>
   </div>
   <button type="button" disabled={busy} onClick={()=>void load()}
    className="inline-flex min-h-9 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-50">
    {busy?"Loading…":"Inspect demo activity"}</button>
  </div>
  <p className="mt-2 text-sm text-slate-600">Read-only counts of local fictional actions. Private reasons, actor names and subject IDs are not included in this overview.</p>
  {error?<p role="alert" className="mt-2 text-xs text-rose-800">{error}</p>:null}
  {metrics?<div className="mt-4 space-y-3">
   <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {figures.map(([label,value])=><div key={label} className="rounded-xl bg-white p-3">
     <p className="text-xs text-slate-600">{label}</p>
     <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>)}
   </div>
   <p className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">{metrics.disclaimer}</p>
  </div>:null}
 </section>;
}
