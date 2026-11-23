import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapStageCounts, stageHazards } from "../src/lib/map-stage";

// Maps, Night Desk step 4b (roadmap 4.1): full-screen map with floating layers and details.
const read = (file: string) => readFileSync(file, "utf8");
const stage = read("src/components/maps/ManagementMapStage.tsx");
const map = read("src/components/maps/GeographicReferenceMap.tsx");

test("the layer switches filter by review state and leave examples to their own switch", () => {
  const pins = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "demo-1" }];
  const states = { a: "unverified", b: "corroborated", c: "rejected" };
  assert.deepEqual(stageHazards(pins, states, { waiting: true, approved: true }).map(p => p.id), ["a", "b", "demo-1"]);
  assert.deepEqual(stageHazards(pins, states, { waiting: false, approved: true }).map(p => p.id), ["b", "demo-1"]);
  assert.deepEqual(stageHazards(pins, states, { waiting: true, approved: false }).map(p => p.id), ["a", "demo-1"]);
  assert.deepEqual(stageHazards([{ id: "new" }], {}, { waiting: true, approved: false }).map(p => p.id), ["new"], "a report with no known state counts as waiting");
  assert.deepEqual(mapStageCounts(pins, states), { waiting: 2, approved: 1 }, "the example has no state, so it counts as waiting here; examples are counted separately in the panel");
});

test("the map uses the shared pins, never emoji, and keeps report text out of the pins", () => {
  const pins = read("src/components/maps/HazardPins.tsx");
  assert.match(pins, /<HazardMarker category=\{point\.category\} impact=\{point\.impact\} reviewState=\{point\.reviewState\}/);
  assert.doesNotMatch(pins, /description/);
  assert.doesNotMatch(map, /info\.symbol/);
  assert.match(map, /reviewState: reviewStates\[h\.id\] \?\? "unverified"/);
  assert.match(read("src/components/maps/BaseMap.tsx"), /isolate/, "map layers stay under the top bar and panels");
});

test("the stage fills the screen with floating panels and stacks them on phones", () => {
  assert.match(read("src/components/management/pages/MapsPage.tsx"), /<ManagementMapStage\/>/);
  assert.match(stage, /<GeographicReferenceMap serviceArea=\{serviceArea\} roads=\{inspectRoads \? visibleRoads : \[\]\}/);
  assert.match(stage, /lg:absolute lg:bottom-20 lg:left-6 lg:top-6 lg:w-\[320px\]/);
  assert.match(stage, /lg:absolute lg:right-6 lg:top-6/);
  assert.match(stage, /order-1[\s\S]*order-3[\s\S]*order-2/, "phones: map, selected item, layers");
});

test("selecting a pin opens its details with a way into review", () => {
  assert.match(stage, /href=\{reportLink\(selectedHazard\.id\)\}/);
  assert.match(stage, /"Review this report" : "Open the report"/);
  assert.match(stage, /<ReviewStateChip reviewState=\{selectedState \?\? "unverified"\} \/>/);
});

test("a map click only places a report while adding one", () => {
  assert.match(stage, /onChooseLocation=\{reporting \? position =>/);
  assert.match(stage, /selectedLocation=\{reporting \? draftPosition : null\}/);
  assert.match(stage, /if \(reporting\) return; setSelectedHazardId\(id\)/, "pins do not steal the click while placing a report");
});

test("the Maps stage takes its data and rules from one hook", () => {
  assert.match(stage, /const ws = useMapWorkspace\(\)/);
  assert.match(stage, /<MapResearchSections ws=\{ws\} \/>/);
  assert.match(stage, /<RoadDetails ws=\{ws\} \/>/);
});
