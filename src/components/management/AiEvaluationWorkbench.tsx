"use client";
import {useState} from "react";

type Metric={threshold:number;tp:number;fp:number;fn:number;tn:number;precision:number|null;recall:number|null;f1:number|null;accuracy:number;pairCount:number};
type LanguageRow={label:string;positivePairs:number;detectedPairs:number;recall:number|null};
type ErrorRow={leftId:string;rightId:string;leftDescription:string;rightDescription:string;similarity:number;languages:string;categories:string};
type EvaluationResult={
 datasetVersion:string;testedAt:string;provider:string;model:string;selection:string;selectedThreshold:number;
 development:{caseCount:number;groupCount:number;metrics:Metric[]};
 holdout:{caseCount:number;groupCount:number;selected:Metric;baseline:Metric;languageRecall:LanguageRow[];errors:{falsePositives:ErrorRow[];falseNegatives:ErrorRow[]}};
 disclaimer:string;
};
const percent=(value:number|null)=>value===null?"N/A":(value*100).toFixed(1)+"%";

function ScoreSummary({title,value}:{title:string;value:Metric}) {
 return <div className="rounded-xl border border-slate-200 bg-white p-3">
  <p className="text-caption font-semibold text-slate-600">{title}</p>
  <p className="mt-1 text-heading font-semibold text-indigo-900">F1 {percent(value.f1)}</p>
  <p className="text-caption text-slate-700">Precision {percent(value.precision)} · Recall {percent(value.recall)}</p>
  <p className="mt-1 text-caption text-slate-500">False matches {value.fp} · Missed pairs {value.fn} · {value.pairCount} evaluated pairs</p>
 </div>;
}
function ErrorExamples({title,items}:{title:string;items:ErrorRow[]}) {
 return <div className="rounded-xl border border-slate-200 bg-white p-3">
  <h4 className="text-caption font-semibold text-slate-800">{title}</h4>
  {items.length===0?<p className="mt-2 text-caption text-slate-600">No examples at the selected threshold.</p>:null}
  <div className="mt-2 space-y-3">{items.map(item=><div key={item.leftId+"-"+item.rightId} className="border-t border-slate-100 pt-2 text-caption leading-5">
   <p className="font-semibold text-slate-800">Similarity {percent(item.similarity)} · {item.languages}</p>
   <p className="text-slate-600">{item.leftDescription}</p>
   <p className="text-slate-600">{item.rightDescription}</p>
   <p className="mt-1 text-slate-500">{item.categories} · Fictional examples</p>
  </div>)}</div>
 </div>;
}
export default function AiEvaluationWorkbench({operatorKey}:{operatorKey:string}){
 const [result,setResult]=useState<EvaluationResult|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function run(){
  setBusy(true);setError("");setResult(null);
  try{
   const response=await fetch("/api/v2/ai-evaluation",{method:"POST",headers:{"x-demo-operator-key":operatorKey},cache:"no-store"});
   const payload=await response.json() as EvaluationResult&{error?:string};
   if(!response.ok)throw Error(payload.error||"Evaluation failed");
   setResult(payload);
  }catch(e){setError(e instanceof Error?e.message:"Evaluation unavailable");}
  finally{setBusy(false);}
 }
 function exportCsv(){
  if(!result)return;
  const rows:[string,...string[]][]=[["set","threshold","precision","recall","f1","tp","fp","fn","tn","pair_count"]];
  for(const m of result.development.metrics)rows.push(["development",String(m.threshold),String(m.precision??""),String(m.recall??""),String(m.f1??""),String(m.tp),String(m.fp),String(m.fn),String(m.tn),String(m.pairCount)]);
  for(const [label,m] of [["heldout_selected",result.holdout.selected],["heldout_current_baseline",result.holdout.baseline]] as const)
   rows.push([label,String(m.threshold),String(m.precision??""),String(m.recall??""),String(m.f1??""),String(m.tp),String(m.fp),String(m.fn),String(m.tn),String(m.pairCount)]);
  const csv=rows.map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="fictional-ai-evaluation-"+result.datasetVersion+".csv";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 }
 return <section className="mt-6 rounded-xl border border-indigo-200 bg-white p-5" aria-label="AI evaluation workbench">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="mt-1 text-heading font-semibold text-slate-900">AI Evaluation Workbench</h2></div>
   <button type="button" onClick={()=>void run()} disabled={busy} className="rounded-lg bg-indigo-800 px-4 py-2 text-small font-semibold text-white disabled:opacity-50">{busy?"Evaluating bilingual samples…":"Evaluate local AI model"}</button>
  </div>
  <p className="mt-2 text-small leading-6 text-slate-600">Separate development and held-out sets of fictional English and Malay hazard reports. We choose a candidate threshold on the development set, then score it on unseen scenario groups. This does not change operational report matching.</p>
  {error?<p role="status" className="mt-3 rounded-lg bg-rose-50 p-3 text-small text-rose-800">{error}</p>:null}
  {result?<div className="mt-4 space-y-5" aria-live="polite">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-caption font-semibold text-slate-700">Provider: {result.provider} · Model: {result.model} · Dataset: {result.datasetVersion} · {new Date(result.testedAt).toLocaleString()}</p>
    <button type="button" onClick={exportCsv} className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-caption font-semibold text-indigo-800">Export metric CSV</button>
   </div>
   <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
    <p className="mt-1 text-heading font-semibold text-indigo-950">Candidate: {result.selectedThreshold.toFixed(2)} similarity</p>
    <p className="mt-1 text-caption leading-5 text-indigo-900">{result.selection} The production-like demonstration still uses its existing 0.78 threshold unless separately reviewed and changed.</p>
   </div>
   <div>
    <h3 className="text-small font-semibold text-slate-900">Development: {result.development.caseCount} descriptions, {result.development.groupCount} related pairs</h3>
    <div className="mt-2 overflow-x-auto"><table className="min-w-full text-left text-caption">
     <thead className="bg-slate-100 text-slate-700"><tr><th className="px-2 py-2">Threshold</th><th className="px-2 py-2">Precision</th><th className="px-2 py-2">Recall</th><th className="px-2 py-2">F1</th><th className="px-2 py-2">False matches</th><th className="px-2 py-2">Missed matches</th></tr></thead>
     <tbody>{result.development.metrics.map(row=><tr key={row.threshold} className={row.threshold===result.selectedThreshold?"border-t bg-indigo-50 font-semibold":"border-t"}>
      <td className="px-2 py-2">{row.threshold.toFixed(2)}{row.threshold===result.selectedThreshold?" (selected)":""}</td>
      <td className="px-2 py-2">{percent(row.precision)}</td><td className="px-2 py-2">{percent(row.recall)}</td>
      <td className="px-2 py-2">{percent(row.f1)}</td><td className="px-2 py-2">{row.fp}</td><td className="px-2 py-2">{row.fn}</td>
     </tr>)}</tbody>
    </table></div>
   </div>
   <div>
    <h3 className="text-small font-semibold text-slate-900">Held-out: {result.holdout.caseCount} descriptions, {result.holdout.groupCount} separate related pairs</h3>
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
     <ScoreSummary title={"Selected development threshold "+result.holdout.selected.threshold.toFixed(2)} value={result.holdout.selected}/>
     <ScoreSummary title={"Existing operational baseline "+result.holdout.baseline.threshold.toFixed(2)} value={result.holdout.baseline}/>
    </div>
   </div>
   <div>
    <h3 className="text-small font-semibold text-slate-900">Held-out related-pair recall by language</h3>
    <div className="mt-2 overflow-x-auto"><table className="min-w-full text-left text-caption">
     <thead className="bg-slate-100"><tr><th className="px-2 py-2">Language combination</th><th className="px-2 py-2">Correctly detected</th><th className="px-2 py-2">Total related pairs</th><th className="px-2 py-2">Recall</th></tr></thead>
     <tbody>{result.holdout.languageRecall.map(row=><tr key={row.label} className="border-t"><td className="px-2 py-2">{row.label}</td><td className="px-2 py-2">{row.detectedPairs}</td><td className="px-2 py-2">{row.positivePairs}</td><td className="px-2 py-2">{percent(row.recall)}</td></tr>)}</tbody>
    </table></div>
    <p className="mt-2 text-caption text-slate-500">This breakdown measures recall on small authored positive pairs, not language-specific precision or population fairness.</p>
   </div>
   <div>
    <h3 className="text-small font-semibold text-slate-900">Held-out diagnostic examples</h3>
    <div className="mt-2 grid gap-3 lg:grid-cols-2">
     <ErrorExamples title="False matches (different fictional incidents)" items={result.holdout.errors.falsePositives}/>
     <ErrorExamples title="Missed matches (same fictional incident)" items={result.holdout.errors.falseNegatives}/>
    </div>
   </div>
   <p className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-caption leading-5 text-slate-700">{result.disclaimer} Scores are not a confirmed-hazard probability or public-safety guarantee.</p>
  </div>:null}
 </section>;
}
