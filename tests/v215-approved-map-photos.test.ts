import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("maps only request the existing approved image endpoint, for approved report IDs",()=>{
 const map=readFileSync("src/components/maps/GeographicReferenceMap.tsx","utf8");
 const resident=readFileSync("src/components/resident/ResidentMapPage.tsx","utf8");
 const hook=readFileSync("src/hooks/useMapWorkspace.ts","utf8");
 const stage=readFileSync("src/components/maps/ManagementMapStage.tsx","utf8");
 // Since the MapLibre move (roadmap 3.1) pins have no pop-ups; photos show in the side panel or the selected card.
 assert.doesNotMatch(map,/\/evidence\//);
 // The resident map shows an approved photo in the selected report, only when the API says one is approved.
 assert.match(resident,/isSelected && report\.hasApprovedPhoto \? <img src=\{`\/api\/v2\/hazards\/\$\{encodeURIComponent\(report\.id\)\}\/evidence\/approved`\}/);
 assert.doesNotMatch(resident,/\/evidence\/private/);
 assert.match(hook,/hasApprovedPhoto/);
 // The management Maps stage shows the same approved photo in its side panel instead of a pop-up.
 assert.match(stage,/photoApprovedIds\.includes\(selectedHazard\.id\)/);
 assert.match(stage,/\/evidence\/approved/);
 assert.doesNotMatch(stage,/\/evidence\/private/);
});
