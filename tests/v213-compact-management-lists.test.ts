import {test} from "node:test";
import assert from "node:assert/strict";
import {readCompactSource as read} from "./source-helpers";
test("management review uses compact selectable list and an adjacent detail panel",()=>{
 const reports=read("src/components/management/V2HazardManager.tsx");
 const groups=read("src/components/management/IncidentManager.tsx");
 assert.match(reports,/visibleItems\.map\(item=><li/);
 assert.match(reports,/aria-pressed=\{selectedReportId===item\.id\}/);
 assert.match(reports,/selectedReport&&visibleItems\.some/);
 assert.match(reports,/xl:grid-cols-/);
 // Incident groups use the same list-and-detail layout as report review (roadmap step 4.2).
 assert.match(groups,/visible\.map\(incident=><li/);
 assert.match(groups,/aria-pressed=\{selectedIncidentId===incident\.id/);
 assert.match(groups,/const selected=incidents\.find\(i=>i\.id===selectedIncidentId\)/);
 assert.match(groups,/xl:grid-cols-/);
});
test("review justifications and separately approved resident photo visibility remain",()=>{
 const reports=read("src/components/management/V2HazardManager.tsx");
 const groups=read("src/components/management/IncidentManager.tsx");
 for(const s of ["function toggleReport","URL.revokeObjectURL(url)","publishPhotos[selectedReport.id]","Approve report","Reject report","x-demo-operator-key","Reason for decision"])assert.ok(reports.includes(s),s);
 assert.match(reports,/publishPhoto:decision==="corroborated"&&photoStates\?\.\[id\]==="private_unreviewed"&&publishPhotos\[id\]===true/);
 for(const s of ["Create a fictional incident group","Find AI candidates","Link selected report","Save incident decision","IncidentRoadCandidates","Operator justification"])assert.ok(groups.includes(s),s);
});
