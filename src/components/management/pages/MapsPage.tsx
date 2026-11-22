"use client";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import {useManagementOperatorKey} from "@/components/management/ManagementShell";
import ManagementMapStage from "@/components/maps/ManagementMapStage";
import DemoController from "@/components/scenarios/DemoController";
import MapWorkspace from "@/components/maps/MapWorkspace";
import ConnectivityPanel from "@/components/network/ConnectivityPanel";

export default function MapsPage(){
 const operatorKey=useManagementOperatorKey();
 return <>
  <ManagementSectionHeading section="maps" subtitle={<p className="mt-1 text-body text-night-muted">Reports on the township roads. Road lines are OpenStreetMap data, not checked on the ground.</p>}/>
  <section aria-label="Interactive incident map"><ManagementMapStage/></section>
  <details className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-5" aria-label="Optional flood simulation">
   <summary className="cursor-pointer font-display text-heading font-semibold text-slate-900">Flood simulation <span className="ml-2 font-sans text-caption font-normal text-slate-600">Optional fictional scenario, opens separately and never changes real reports</span></summary>
   <p className="mt-3 text-small text-slate-600">Explore the separate schematic flood model. It cannot verify real travel conditions.</p>
   <DemoController operatorKey={operatorKey}/>
   <MapWorkspace variant="management"/>
   <ConnectivityPanel/>
  </details>
 </>;
}
