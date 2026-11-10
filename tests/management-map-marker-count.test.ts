import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {readCompactSource} from "./source-helpers";

test("map defaults to submitted reports without authored example markers",()=>{
 const src=readFileSync("src/components/maps/GeographicReferenceWorkspace.tsx","utf8");
 assert.match(src,/showExampleHazards, setShowExampleHazards\] = useState\(false\)/);
 assert.match(src,/const allHazards=\[\.\.\.submittedMapHazards,\.\.\.\(showExampleHazards\?DEMO_HAZARDS:\[\]\)\]/);
 assert.match(src,/Include 4 built-in examples/);
 assert.match(src,/submittedMapHazards\.length/);
});
test("rejected reports are excluded from map but retained in the review workflow",()=>{
 const map=readFileSync("src/components/maps/GeographicReferenceWorkspace.tsx","utf8");
 const review=readCompactSource("src/components/management/V2HazardManager.tsx");
 assert.match(map,/reviewState==="rejected"/);
 assert.match(map,/storedHazards\.filter\(item=>!rejectedIds\.has\(item\.id\)\)/);
 assert.match(review,/visibleItems=filterReviewReports\(items/);
 assert.match(review,/Reject report/);
});
