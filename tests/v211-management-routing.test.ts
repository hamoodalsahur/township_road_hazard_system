import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MANAGEMENT_SECTIONS} from "../src/lib/management-sections";

const read=(path:string)=>readFileSync(path,"utf8");
const componentPaths={
  overview:"src/components/management/pages/OverviewPage.tsx",
  incidents:"src/components/management/pages/IncidentsPage.tsx",
  maps:"src/components/management/pages/MapsPage.tsx",
  evidence:"src/components/management/pages/EvidencePage.tsx",
  research:"src/components/management/pages/ResearchPage.tsx",
  system:"src/components/management/pages/SystemPage.tsx"
} as const;
const retained={
  overview:["ReviewAgeQueue","OperatorAuditSummary"],
  incidents:["IncidentManager","V2HazardManager","ReportWorkspace"],
  maps:["ManagementMapStage","DemoController","MapWorkspace","ConnectivityPanel"],
  evidence:["EvidenceInventory","EvidenceConsistency"],
  research:["AiEvaluationWorkbench","ResearchExport"],
  system:["DemoDataQuality","RoadTopologyQuality","GeoSourceManifest","RoadAccessTags","AuditPanel"]
} as const;

test("each navigation entry resolves to a real App Router page using a scoped client component",()=>{
 for(const section of MANAGEMENT_SECTIONS){
  const route=section.href==="/management"?"src/app/management/page.tsx":
   "src/app"+section.href+"/page.tsx";
  const source=read(route);
  const view=read(componentPaths[section.id]);
  assert.match(source,/export default function Page/);
  assert.match(source,/components\/management\/pages\//);
  assert.match(view,/useManagementOperatorKey/);
  assert.match(view,/ManagementSectionHeading/);
 }
});
test("all active management workflows remain accessible from their intended sections",()=>{
 const all=new Set<string>();
 for(const section of MANAGEMENT_SECTIONS){
  const view=read(componentPaths[section.id]);
  for(const name of retained[section.id]){
   assert.match(view,new RegExp("<"+name+"\\b"));
   assert.equal(all.has(name),false,"Tool should not mount on two pages: "+name);
   all.add(name);
  }
 }
 assert.equal(all.size,18);
 const overview=read(componentPaths.overview);
 assert.match(overview,/\/api\/v2\/incident-oversight/);
 assert.match(overview,/\/api\/v2\/hazards/);
});
test("operator navigation stays within persistent management layout and original local authorization boundary",()=>{
 const shell=read("src/components/management/ManagementShell.tsx");
 const layout=read("src/app/management/layout.tsx");
 const landing=read("src/app/management/page.tsx");
 assert.match(layout,/ManagementShell/);
 assert.match(shell,/MANAGEMENT_SECTIONS\.map/);
 assert.match(shell,/aria-current/);
 assert.match(shell,/\/api\/audit/);
 assert.match(shell,/x-demo-operator-key/);
 assert.match(shell,/OperatorKeyContext\.Provider/);
 assert.doesNotMatch(shell,/localStorage|sessionStorage|document\.cookie/);
 assert.doesNotMatch(landing,/ManagementControls/);
});
test("private image approval and fictional/Osm disclaimers remain in the same established workflows",()=>{
 const incident=read(componentPaths.incidents);
 const evidence=read(componentPaths.evidence);
 const maps=read(componentPaths.maps);
 const system=read(componentPaths.system);
 assert.match(incident,/V2HazardManager/);
 assert.match(evidence,/incidents#report-review/);
 assert.doesNotMatch(evidence,/<V2HazardManager\b/);
 assert.match(read("src/components/maps/ManagementMapStage.tsx"),/Roads: OpenStreetMap, not verified/);
 assert.match(read("src/components/resident/ResidentMapPage.tsx"),/Fictional demo reports\. They are not live road conditions/);
 assert.match(maps,/schematic/);
 assert.match(system,/read-only/);
});
