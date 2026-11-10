import {test} from "node:test";
import assert from "node:assert/strict";
import {readCompactSource} from "./source-helpers";
test("failed review feeds are not presented as current or actionable",()=>{
 const src=readCompactSource("src/components/management/V2HazardManager.tsx");
 assert.match(src,/setLoadError\(/);
 assert.match(src,/Retry/);
 assert.match(src,/role="alert"/);
 assert.match(src,/!loading&&!loadError&&<div/);
 assert.match(src,/setPhotoStates\(null\)/);
 assert.match(src,/No matching reports/);
 assert.match(src,/No previous review data is shown as current/);
});
