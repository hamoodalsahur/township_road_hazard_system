"use client";
import {useState} from "react";
export default function ResearchExport({operatorKey}:{operatorKey:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function download(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/v2/research-export",{headers:{"x-demo-operator-key":operatorKey},cache:"no-store"});
   if(!response.ok)throw Error("Could not prepare research export");
   const url=URL.createObjectURL(await response.blob());
   const link=document.createElement("a");link.href=url;link.download="fictional-incident-research.csv";
   document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }catch(e){setError(e instanceof Error?e.message:"Export failed");}
  finally{setBusy(false);}
 }
 return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4" aria-label="Demo research export">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="font-semibold text-slate-900">Fictional incident research export</h2>
    <p className="mt-1 text-caption text-slate-600">Download report and incident status metadata as CSV for your project evaluation. Excludes photos, free-text descriptions, precise coordinates and operator notes.</p></div>
   <button type="button" disabled={busy} onClick={()=>void download()} className="rounded-lg border border-teal-400 px-3 py-2 text-caption font-semibold text-teal-900 disabled:opacity-50">{busy?"Preparing…":"Download research CSV"}</button>
  </div>
  {error?<p role="alert" className="mt-2 text-caption text-rose-700">{error}</p>:null}
  <p className="mt-2 text-caption text-slate-700">Local fictional records only. Exported IDs and metadata are for internal coursework and must not be represented as verified public incidents.</p>
 </section>;
}
