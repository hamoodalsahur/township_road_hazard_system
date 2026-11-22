"use client";
import { useState } from "react";
import { ArrowClockwiseIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import { useManagementOperatorKey } from "@/components/management/ManagementShell";
import SystemOverview from "@/components/management/SystemOverview";
import DemoDataQuality from "@/components/management/DemoDataQuality";
import RoadTopologyQuality from "@/components/management/RoadTopologyQuality";
import GeoSourceManifest from "@/components/management/GeoSourceManifest";
import RoadAccessTags from "@/components/management/RoadAccessTags";
import AuditPanel from "@/components/audit/AuditPanel";
import ServiceAreaStatus from "@/components/management/ServiceAreaStatus";

const disclosure = "group rounded-xl border border-slate-200 bg-white";
const summary = "flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-body font-semibold text-slate-900";

/** System & Audit, Night Desk: status at a glance, then the operator actions, then the detail. */
export default function SystemPage() {
  const operatorKey = useManagementOperatorKey();
  const [runs, setRuns] = useState(0);
  return <>
    <ManagementSectionHeading section="system" subtitle={<p className="mt-1 text-body text-night-muted">Checks for the local demo. Everything here is read-only and changes no data.</p>}
      actions={<Button variant="night" onClick={() => setRuns(n => n + 1)}><ArrowClockwiseIcon size={16} aria-hidden="true" />Run checks again</Button>} />
    <SystemOverview operatorKey={operatorKey} reloadToken={runs} />
    <div className="mt-6 space-y-3">
      <details className={disclosure} aria-label="Service area and data details">
        <summary className={summary}><CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />Service area and data checks in detail</summary>
        <div className="px-5 pb-5"><ServiceAreaStatus /><DemoDataQuality operatorKey={operatorKey} /></div>
      </details>
      <details className={disclosure} aria-label="OSM geographic diagnostics">
        <summary className={summary}><CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />Map source diagnostics</summary>
        <div className="px-5 pb-5"><RoadTopologyQuality operatorKey={operatorKey} /><GeoSourceManifest operatorKey={operatorKey} /><RoadAccessTags operatorKey={operatorKey} /></div>
      </details>
      <details className={disclosure} aria-label="Operator audit history">
        <summary className={summary}><CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />Full audit text<span className="text-caption font-normal text-slate-600">Every stored field, as recorded</span></summary>
        <div className="px-5 pb-5"><AuditPanel operatorKey={operatorKey} /></div>
      </details>
    </div>
  </>;
}
