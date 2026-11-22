"use client";
import {CaretRightIcon} from "@phosphor-icons/react";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import {useManagementOperatorKey} from "@/components/management/ManagementShell";
import AiEvaluationWorkbench from "@/components/management/AiEvaluationWorkbench";
import ResearchExport from "@/components/management/ResearchExport";

export default function ResearchPage(){
 const operatorKey=useManagementOperatorKey();
 return <>
  <ManagementSectionHeading section="research" subtitle={<p className="mt-1 text-body text-night-muted">AI suggestions are optional. Operators make every decision.</p>}/>
  <ResearchExport operatorKey={operatorKey}/>
  <details className="group mt-6 rounded-xl border border-slate-200 bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-body font-semibold text-slate-900">
      <CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true"/>AI model evaluation <span className="text-caption font-normal text-slate-600">Optional research tools</span></summary>
    <div className="px-5 pb-5"><AiEvaluationWorkbench operatorKey={operatorKey}/></div>
  </details>
 </>;
}
