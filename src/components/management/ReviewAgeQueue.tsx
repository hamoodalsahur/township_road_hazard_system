"use client";
import {useState} from "react";
import type {ReviewAgeSummary} from "@/lib/v2-review-age-queue";

export default function ReviewAgeQueue({operatorKey}:{operatorKey:string}){
  const [summary,setSummary]=useState<ReviewAgeSummary|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function inspect(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/v2/review-age-queue",{
        headers:{"x-demo-operator-key":operatorKey},cache:"no-store"
      });
      const data=await response.json() as {summary?:ReviewAgeSummary;error?:string};
      if(!response.ok||!data.summary)throw Error(data.error||"Could not load review queue");
      setSummary(data.summary);
    }catch(e){setError(e instanceof Error?e.message:"Review queue unavailable");}
    finally{setBusy(false);}
  }
  return <section className="rounded-2xl bg-slate-50 p-5" aria-label="Fictional review age queue">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[13px] font-semibold text-slate-500">Research workload · no emergency scoring</p>
        <h2 className="mt-0.5 text-lg font-semibold text-slate-900">Fictional review-age queue</h2>
      </div>
      <button type="button" disabled={busy} onClick={()=>void inspect()}
        className="inline-flex min-h-9 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-50">
        {busy?"Loading…":"Inspect review ages"}</button>
    </div>
    <p className="mt-2 text-sm text-slate-600">Read-only timestamps for fictional unverified reports and under-review incident groups. This is not a hazard severity ranking or dispatch service.</p>
    {error?<p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>:null}
    {summary?<div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ["Review records",summary.eligibleCount],
          ["Older than 24h",summary.olderThan24h],
          ["Older than 72h",summary.olderThan72h],
          ["Invalid/future times",summary.futureOrInvalidDates]
        ] as const).map(([label,value])=><div key={label} className="rounded-xl bg-white p-3">
          <p className="text-xs text-slate-600">{label}</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
        </div>)}
      </div>
      {summary.entries.length===0?<p className="text-sm text-slate-600">No eligible fictional records with valid past timestamps.</p>:null}
      <ul className="space-y-2">{summary.entries.map(item=><li key={item.kind+item.id} className="rounded-xl bg-white p-3 text-xs">
        <p className="font-semibold">{item.kind==="report"?"Unverified report":"Under-review incident"} · {item.category.replaceAll("_"," ")} · {item.ageHours} whole hours</p>
        <p className="mt-1 text-slate-600">Demo reference: <span className="break-all">{item.id}</span> · {item.ageBand.replaceAll("_"," ")}{item.kind==="report"?(item.grouped?" · already grouped":" · ungrouped"):""}</p>
      </li>)}</ul>
      {summary.truncated?<p className="text-xs text-slate-600">Showing the oldest {summary.entries.length} records only; counts include all eligible records.</p>:null}
      <p className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">{summary.disclaimer}</p>
    </div>:null}
  </section>;
}
