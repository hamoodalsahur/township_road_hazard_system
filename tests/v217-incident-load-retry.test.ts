import {test} from "node:test";
import assert from "node:assert/strict";
import {readCompactSource} from "./source-helpers";
test("incident list displays actionable load-error and retry without a false empty state",()=>{
 const s=readCompactSource("src/components/management/IncidentManager.tsx");
 assert.match(s,/setLoadError\(/);
 assert.match(s,/role="alert"/);
 assert.match(s,/Retry loading/);
 assert.match(s,/!loading&&!loadError&&incidents\.length===0/);
 assert.match(s,/!loadError&&visible\.map/);
 assert.doesNotMatch(s,/db:push|db:seed/);
});
