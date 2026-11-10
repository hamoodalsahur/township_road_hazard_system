"use client";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import {useManagementOperatorKey} from "@/components/management/ManagementShell";
import DemoDataQuality from "@/components/management/DemoDataQuality";
import RoadTopologyQuality from "@/components/management/RoadTopologyQuality";
import GeoSourceManifest from "@/components/management/GeoSourceManifest";
import RoadAccessTags from "@/components/management/RoadAccessTags";
import AuditPanel from "@/components/audit/AuditPanel";
import ServiceAreaStatus from "@/components/management/ServiceAreaStatus";

export default function SystemPage(){
 const operatorKey=useManagementOperatorKey();
 return <>
  <ManagementSectionHeading section="system"/>
  <p className="mb-4 text-sm text-slate-600">System checks and read-only records for the local fictional prototype.</p>
  <ServiceAreaStatus/>
  <DemoDataQuality operatorKey={operatorKey}/>
  <div className="mt-6 space-y-4">
   <details className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="OSM geographic diagnostics">
    <summary className="cursor-pointer font-semibold text-slate-900">Map source diagnostics</summary>
    <p className="mt-2 text-sm text-slate-600">Detailed geographic source and reference-data information.</p>
    <RoadTopologyQuality operatorKey={operatorKey}/>
    <GeoSourceManifest operatorKey={operatorKey}/>
    <RoadAccessTags operatorKey={operatorKey}/>
   </details>
   <details className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Operator audit history">
    <summary className="cursor-pointer font-semibold text-slate-900">Full fictional audit history</summary>
    <p className="mt-2 text-sm text-slate-600">Detailed history of recorded operator actions.</p>
    <AuditPanel operatorKey={operatorKey}/>
   </details>
  </div>
 </>;
}
