"use client";
import {useEffect,useState} from "react";
type Issue={kind:string;subjectId:string;detail:string};
type Quality={reportCount:number;incidentCount:number;issueCount:number;issues:Issue[];truncated:boolean;disclaimer:string};
export default function DemoDataQuality({operatorKey}:{operatorKey:string}){
 const [quality,setQuality]=useState<Quality|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function refresh(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/v2/demo-quality",{headers:{"x-demo-operator-key":operatorKey},cache:"no-store"});
   const data=await response.json() as Quality&{error?:string};
   if(!response.ok)throw Error(data.error||"Unable to inspect data");
   setQuality(data);
  }catch(e){setError(e instanceof Error?e.message:"Inspection failed");}
  finally{setBusy(false);}
 }
 useEffect(()=>{void refresh();},[operatorKey]);
 return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-heading font-semibold">Fictional data consistency</h2><button type="button" disabled={busy} onClick={()=>void refresh()} className="rounded-lg border px-3 py-2 text-caption">{busy?"Checking…":"Recheck"}</button></div>
  <p className="mt-2 text-small text-slate-600">Read-only checks for mismatched categories, rejected grouped reports and incomplete fictional records.</p>
  {error?<p role="alert" className="mt-2 text-small text-rose-800">{error}</p>:null}
  {quality?<div className="mt-3 space-y-3 text-small"><p className="font-semibold">{quality.issueCount} issues · {quality.reportCount} reports · {quality.incidentCount} groups</p>
   {quality.issues.map((item,i)=><p key={item.kind+"-"+item.subjectId+"-"+i} className="rounded-lg bg-slate-50 p-2 text-caption"><strong>{item.kind.replaceAll("_"," ")}</strong> · {item.subjectId}: {item.detail}</p>)}
   {quality.truncated?<p>Only first 100 issues displayed.</p>:null}
   <p className="text-caption text-slate-500">{quality.disclaimer}</p>
  </div>:null}
 </section>;
}
