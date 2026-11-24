import {test} from "node:test";
import assert from "node:assert/strict";
import {MANAGEMENT_SECTIONS,managementSectionFromPath} from "../src/lib/management-sections";

test("top menu links to exactly five separate operator pages",()=>{
  assert.deepEqual(MANAGEMENT_SECTIONS.map(s=>s.id),
    ["overview","incidents","maps","evidence","system"]);
  assert.equal(new Set(MANAGEMENT_SECTIONS.map(s=>s.href)).size,5);
  for(const section of MANAGEMENT_SECTIONS){
    assert.ok(section.label.length>2);
    assert.ok(section.description.length>10);
    assert.equal(managementSectionFromPath(section.href),section.id);
    assert.equal(managementSectionFromPath(section.href+"/"),section.id);
  }
});
test("unknown, resident and similarly prefixed URLs are not highlighted as operator sections",()=>{
  for(const path of ["/","/resident","/management/incident","/management/incidents/private","/managementx","/management/research-extra"]){
    assert.equal(managementSectionFromPath(path),null);
  }
});
