import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { closureAfterApproval } from "../src/lib/road-closures";

test("approving a 'possibly closed' report offers to close the road to cars", () => {
  assert.deepEqual(closureAfterApproval("suspected_closure", "fallen_tree", "Tree across both lanes, seen on camera"),
    { kind: "closed", reason: "Tree across both lanes, seen on camera" });
});

test("approving a 'partly blocked' report offers one lane only", () => {
  assert.equal(closureAfterApproval("partial_obstruction", "roadworks", "Cones on one side")?.kind, "one_lane");
});

test("other reports open nothing: approval alone never changes a road", () => {
  for (const impact of ["caution", "unknown", "anything"]) assert.equal(closureAfterApproval(impact, "pothole", "Deep pothole here"), null);
});

test("a short or empty approval note still gives a valid closure reason", () => {
  const start = closureAfterApproval("suspected_closure", "fallen_tree", "ok");
  assert.equal(start?.reason, "Fallen tree report approved by the operator");
  assert.ok(start!.reason.length >= 8);
  assert.ok(closureAfterApproval("suspected_closure", "flooding", "x".repeat(900))!.reason.length <= 400);
});

test("the review desk opens Close roads after approval, with the nearest road picked", () => {
  const desk = readFileSync("src/components/management/V2HazardManager.tsx", "utf8");
  assert.match(desk, /closureAfterApproval\(item\.impact/);
  assert.match(desk, /start=\{afterApprove\.start\}/);
  const dialog = readFileSync("src/components/closures/CloseRoadsDialog.tsx", "utf8");
  assert.match(dialog, /setSelected\(\[candidates\[0\]\.id\]\)/);
  assert.match(dialog, /"Not now"/);
});
