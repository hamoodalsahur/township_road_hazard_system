import {test} from "node:test";
import assert from "node:assert/strict";
import {readCompactSource} from "./source-helpers";
test("approved and operator-only attached images use separate endpoints",()=>{
 const s=readCompactSource("src/components/management/V2HazardManager.tsx");
 assert.match(s,/selectedPhotoMode==="approved_inline"/);
 assert.match(s,/selectedPhotoMode==="inspect_private"/);
 assert.match(s,/\/evidence\/approved/);
 assert.match(s,/\/evidence\/private/);
 assert.match(s,/headers:\{"x-demo-operator-key":operatorKey\}/);
 assert.match(s,/void viewEvidence\(selectedReportId\)/);
 assert.doesNotMatch(s,/Rule-based triage \(not AI\)/);
});
test("automatic operator preview checks selection, revokes blob URLs, and fails closed",()=>{
 const s=readCompactSource("src/components/management/V2HazardManager.tsx");
 assert.match(s,/activeSelectionRef\.current!==id/);
 assert.match(s,/URL\.revokeObjectURL/);
 assert.match(s,/selectedPhotoMode==="unavailable"/);
 assert.match(s,/Photo information could not be verified/);
 assert.match(s,/publishPhotos\[selectedReport\.id\]/);
});
