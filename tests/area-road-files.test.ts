import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseServiceArea, roadsFileFor, roadsUrlFor } from "../src/lib/service-area";
import { importAreaProblem, overpassQueryFor, roadsTouchingArea } from "../src/lib/area-road-import";
import { convertOsmWay } from "../src/lib/bbr-osm-import";
import type { RoadFeature } from "../src/lib/bbr-roads";

// Your own service area gets its own road file; BBR's file is never touched.
const read = (file: string) => readFileSync(file, "utf8");
const area = parseServiceArea({ type: "Feature", properties: { id: "test-area", name: "Test area" },
  geometry: { type: "Polygon", coordinates: [[[100.0, 5.0], [100.02, 5.0], [100.02, 5.02], [100.0, 5.02], [100.0, 5.0]]] } });
const road = (id: string, coords: [number, number][]): RoadFeature => ({ type: "Feature",
  properties: { id, name: "", highway: "residential", sourceUrl: "", verification: "osm_unverified" }, geometry: { type: "LineString", coordinates: coords } });

test("each area has its own road file, and BBR keeps its original one", () => {
  assert.equal(roadsFileFor("bbr"), "bbr-roads.geojson");
  assert.equal(roadsFileFor("local"), "roads/local.geojson");
  assert.equal(roadsUrlFor("local"), "/data/roads/local.geojson");
  assert.throws(() => roadsFileFor("../secrets"), /invalid area id/, "an id can never leave the roads folder");
  assert.match(read(".gitignore"), /^\/public\/data\/roads\/$/m, "your area's roads never reach GitHub");
});

test("the importer refuses BBR and a broken area file", () => {
  assert.match(importAreaProblem("bbr", null) ?? "", /protected/);
  assert.match(importAreaProblem("bbr", "config/service-areas/local.geojson was not found.") ?? "", /could not be loaded.*not found/, "a missing local file is reported as such");
  assert.match(importAreaProblem("local", "not found") ?? "", /could not be loaded/);
  assert.equal(importAreaProblem("local", null), null);
});

test("it asks OpenStreetMap for roads in the area plus a small margin, without footpaths", () => {
  const query = overpassQueryFor(area);
  assert.match(query, /\(4\.998000,99\.998000,5\.022000,100\.022000\)/);
  assert.match(query, /"highway"!~"footway\|path\|steps\|cycleway/);
});

test("roads are kept only when they touch the area", () => {
  const kept = roadsTouchingArea([road("in", [[100.01, 5.01], [100.03, 5.01]]), road("out", [[100.05, 5.05], [100.06, 5.06]])], area);
  assert.deepEqual(kept.map(r => r.properties.id), ["in"]);
});

test("the OSM converter accepts an area's bounds instead of BBR's", () => {
  const way = { type: "way", id: 42, tags: { highway: "residential", name: "Jalan Contoh" }, geometry: [{ lat: 5.01, lon: 100.01 }, { lat: 5.011, lon: 100.012 }] };
  assert.equal(convertOsmWay(way), null, "outside the default BBR window");
  assert.equal(convertOsmWay(way, { south: 5.0, west: 100.0, north: 5.02, east: 100.02 }, 0.01)?.properties.name, "Jalan Contoh");
});

test("every road reader follows the active area", () => {
  for (const file of ["src/app/api/v2/incidents/[id]/road-candidates/route.ts", "src/app/api/v2/road-topology-quality/route.ts",
    "src/app/api/v2/geo-source-manifest/route.ts", "src/app/api/v2/road-access-tags/route.ts"]) {
    const source = read(file);
    assert.match(source, /activeRoadsPath\(\)/, file);
    assert.doesNotMatch(source, /bbr-roads\.geojson/, file);
  }
  assert.match(read("src/lib/road-loader.ts"), /fetch\(roadsUrlFor\(areaId\)/);
  assert.match(read("src/hooks/useMapWorkspace.ts"), /fetch\(roadsUrlFor\(areaId\)/);
  for (const file of ["src/components/hazards/OverviewMap.tsx", "src/components/hazards/ReportMiniMap.tsx"]) {
    assert.match(read(file), /if \(!loaded\) return;/, `${file} waits for the area before loading roads`);
  }
  assert.match(read("src/components/hazards/OverviewMap.tsx"), /isInsideServiceArea\(serviceArea\.area, r\.longitude, r\.latitude\)/);
});

test("the importer tries several servers, waits once when one is busy, and says why one failed", () => {
  const script = read("scripts/import-area-roads.ts");
  assert.ok((script.match(/https:\/\/[a-z0-9.-]+\/[a-z/]*interpreter/g) ?? []).length >= 5);
  assert.match(script, /const BUSY = new Set\(\[429, 502, 503, 504\]\)/);
  assert.match(script, /await pause\(15_000\)/);
  assert.match(script, /server name not found/);
});

test("the importer never writes the BBR file and keeps an old file before replacing it", () => {
  const script = read("scripts/import-area-roads.ts");
  assert.doesNotMatch(script, /bbr-roads\.geojson"/);
  assert.match(script, /importAreaProblem\(loaded\.area\.id, loaded\.fallbackReason\)/);
  assert.match(script, /if \(!replace\) throw Error/);
  assert.match(script, /copyFile\(destination, kept, constants\.COPYFILE_EXCL\)/);
  assert.ok(script.indexOf("copyFile(destination, kept") < script.indexOf("writeFile(destination"));
});
