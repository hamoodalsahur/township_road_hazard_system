import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP_STYLE_URL, areaOutline, boundsOf, clusterPins, legendFor, roadLayerData, type PinPoint } from "../src/lib/map-platform";
import { DEFAULT_SERVICE_AREA } from "../src/lib/service-area";
import type { RoadFeature } from "../src/lib/bbr-roads";

// Roadmap 3.1–3.2: MapLibre with OpenFreeMap Positron, pin clustering, and a legend of what is on screen.
const read = (file: string) => readFileSync(file, "utf8");
const pin = (id: string, lon: number, lat: number, impact = "caution", reviewState = "unverified"): PinPoint =>
  ({ id, category: "flooding", impact, reviewState, longitude: lon, latitude: lat });
const world: [number, number, number, number] = [-180, -85, 180, 85];

test("close pins become one bubble that takes the most serious colour and counts the ones being checked", () => {
  const pins = [pin("a", 101.43, 3.08), pin("b", 101.4301, 3.0801, "suspected_closure", "corroborated"), pin("c", 101.4302, 3.08)];
  const far = clusterPins(pins, world, 12);
  assert.equal(far.length, 1);
  const bubble = far[0];
  assert.equal(bubble.kind, "cluster");
  if (bubble.kind === "cluster") {
    assert.equal(bubble.count, 3);
    assert.equal(bubble.impact, "suspected_closure");
    assert.equal(bubble.waiting, 2);
    assert.ok(bubble.expansionZoom > 12);
  }
  const near = clusterPins(pins, world, 19);
  assert.deepEqual(near.map(i => i.kind === "pin" ? i.point.id : "cluster").sort(), ["a", "b", "c"], "zoomed in, every pin stands alone");
});

test("the selected pin is never hidden inside a bubble, and pins outside the view are left out", () => {
  const pins = [pin("a", 101.43, 3.08), pin("b", 101.4301, 3.0801), pin("far", 100, 5)];
  const items = clusterPins(pins, [101.4, 3.0, 101.5, 3.1], 12, "b");
  assert.ok(items.some(i => i.kind === "pin" && i.point.id === "b"));
  assert.ok(!items.some(i => i.kind === "pin" && i.point.id === "far"));
  assert.equal(clusterPins(pins, [101.4, 3.0, 101.5, 3.1], 12, "far").some(i => i.kind === "pin" && i.point.id === "far"), false);
});

test("the legend lists only the severities and states on screen, most serious first", () => {
  const legend = legendFor([pin("a", 0, 0, "caution"), pin("b", 0, 0, "suspected_closure", "corroborated")]);
  assert.deepEqual(legend.severities.map(s => s.key), ["suspected_closure", "caution"]);
  assert.equal(legend.waiting, true);
  assert.equal(legend.confirmed, true);
  assert.deepEqual(legendFor([]).severities, []);
  assert.equal(legendFor([pin("a", 0, 0)]).confirmed, false);
});

test("map data helpers: area as dashed lines, roads with class and selection, bounds", () => {
  const outline = areaOutline(DEFAULT_SERVICE_AREA);
  assert.equal(outline.features[0].geometry.type, "LineString");
  const road: RoadFeature = { type: "Feature", geometry: { type: "LineString", coordinates: [[101.4, 3.06], [101.41, 3.07]] },
    properties: { id: "osm-way-1", name: "", highway: "primary", sourceUrl: "https://www.openstreetmap.org/way/1", verification: "osm_unverified" } };
  const data = roadLayerData([road], "osm-way-1");
  assert.deepEqual(data.features[0].properties, { id: "osm-way-1", name: "Unnamed road", cls: "major", selected: true });
  assert.deepEqual(boundsOf([[1, 2], [3, -1]]), [1, -1, 3, 2]);
  assert.equal(boundsOf([]), null);
});

test("every website map uses MapLibre with OpenFreeMap Positron; Leaflet is left only for the schematic simulation", () => {
  assert.equal(MAP_STYLE_URL, "https://tiles.openfreemap.org/styles/positron");
  const base = read("src/components/maps/BaseMap.tsx");
  assert.match(base, /from "@vis\.gl\/react-maplibre"/);
  assert.match(base, /mapStyle=\{MAP_STYLE_URL\}/);
  assert.doesNotMatch(base, /attributionControl=\{false\}/, "the map credit stays on");
  for (const file of ["src/components/maps/GeographicReferenceMap.tsx", "src/components/resident/ResidentMap.tsx"]) {
    const source = read(file);
    assert.match(source, /<BaseMap /, file);
    assert.doesNotMatch(source, /leaflet|tile\.openstreetmap\.org/, file);
  }
  assert.match(read("src/components/maps/NetworkMap.tsx"), /react-leaflet/);
});

test("residents see no road overlay; operators draw it only in road-inspection mode", () => {
  assert.doesNotMatch(read("src/components/resident/ResidentMap.tsx"), /roadLayerData|Source id="roads"/);
  const stage = read("src/components/maps/ManagementMapStage.tsx");
  assert.match(stage, /const \[inspectRoads, setInspectRoads\] = useState\(false\)/);
  assert.match(stage, /roads=\{inspectRoads \? visibleRoads : \[\]\}/);
  assert.match(stage, /<MapLegend visible=\{onScreen\} audience="operator" \/>/);
  assert.match(read("src/components/resident/ResidentMapPage.tsx"), /<MapLegend visible=\{onScreen\} audience="resident" \/>/);
});

test("pins are buttons with a spoken name, and a click on a pin does not also select a road", () => {
  const pins = read("src/components/maps/HazardPins.tsx");
  assert.match(pins, /<button type="button" aria-label=\{label\}/);
  assert.equal(pins.match(/event\.stopPropagation\(\)/g)?.length, 2);
  assert.match(pins, /if \(key === lastVisible\.current\) return;/, "the legend update cannot loop");
});
