import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectionFromRows, lineBounds, roadImportProblem, roadLineRows, ROAD_LINES_API } from "../src/lib/road-lines";
import type { RoadFeature } from "../src/lib/bbr-roads";

// Roadmap step 2.3: road lines live in Postgres; the GeoJSON files are only read.
const read = (file: string) => readFileSync(file, "utf8");
const road = (n: number, coords: [number, number][], extra: Partial<RoadFeature["properties"]> = {}): RoadFeature => ({
  type: "Feature", geometry: { type: "LineString", coordinates: coords },
  properties: { id: `osm-way-${n}`, name: `Jalan ${n}`, highway: "residential", sourceUrl: `https://www.openstreetmap.org/way/${n}`, verification: "osm_unverified", ...extra },
});
const a = road(1, [[100.01, 5.01], [100.02, 5.015]], { oneway: "yes" });
const b = road(2, [[100.03, 5.02], [100.025, 5.03], [100.04, 5.025]]);

test("each line becomes one row, numbered in file order, with its bounds", () => {
  const rows = roadLineRows("local", [a, b], "imp1");
  assert.deepEqual(rows.map(r => [r.areaId, r.wayId, r.position, r.importId]), [["local", "osm-way-1", 0, "imp1"], ["local", "osm-way-2", 1, "imp1"]]);
  assert.deepEqual({ west: rows[1].west, south: rows[1].south, east: rows[1].east, north: rows[1].north }, { west: 100.025, south: 5.02, east: 100.04, north: 5.03 });
  assert.equal(rows[0].properties.oneway, "yes", "every property is kept");
  assert.notEqual(rows[0].properties, a.properties, "rows hold copies, never the caller's objects");
  assert.deepEqual(lineBounds([[1, 2]]), { west: 1, south: 2, east: 1, north: 2 });
});

test("a way listed twice stops the import before the database is touched", () => {
  assert.throws(() => roadLineRows("local", [a, a], "x"), /osm-way-1 twice/);
});

test("rows turn back into the same lines, in file order, whatever order they arrive in", () => {
  const rows = roadLineRows("local", [a, b], "imp1");
  const back = collectionFromRows([rows[1], rows[0]]);
  assert.deepEqual(back?.features, [a, b]);
  assert.equal(collectionFromRows([{ position: 0, coordinates: [[1, 2]], properties: a.properties }]), null, "a broken row is never drawn");
});

test("the import refuses a broken or empty file, and BBR's GitHub placeholder says what it is", () => {
  assert.match(roadImportProblem("x.geojson", { nope: true }, "local") ?? "", /not a valid road file/);
  assert.match(roadImportProblem("roads/local.geojson", { type: "FeatureCollection", features: [] }, "local") ?? "", /npm run geo:import-area/);
  const bbr = roadImportProblem("bbr-roads.geojson", { type: "FeatureCollection", features: [] }, "bbr") ?? "";
  assert.match(bbr, /empty placeholder/);
  assert.doesNotMatch(bbr, /geo:import/, "never suggests re-importing the protected BBR file");
  assert.equal(roadImportProblem("ok", { type: "FeatureCollection", features: [a] }, "local"), null);
});

test("the schema and a committed migration add the road tables", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model RoadLine \{[\s\S]*@@id\(\[areaId, wayId\]\)[\s\S]*@@map\("road_lines"\)/);
  assert.match(schema, /model RoadImport \{[\s\S]*sha256\s+String[\s\S]*@@map\("road_imports"\)/);
  const sql = read("prisma/migrations/20261123000000_road_lines/migration.sql");
  assert.match(sql, /CREATE TABLE "road_lines"/);
  assert.match(sql, /CREATE TABLE "road_imports"/);
  assert.doesNotMatch(sql, /DROP|ALTER TABLE "(?!road_lines)/, "the migration only adds; it never changes existing tables");
});

test("the import script only reads the GeoJSON file and replaces an area's rows in one transaction", () => {
  const script = read("scripts/import-roads-to-db.ts");
  assert.doesNotMatch(script, /writeFile|copyFile|rename|unlink|rm\(|createWriteStream/, "the file is never written");
  assert.match(script, /\$transaction\(/);
  assert.match(script, /deleteMany\(\{ where: \{ areaId \} \}\)/, "only this area's rows are replaced");
  assert.match(script, /targetProblem\(process\.env\.DATABASE_URL\)/, "refuses anything but Postgres");
  assert.match(script, /--dry-run/);
  assert.match(read("package.json"), /"db:import-roads": "tsx scripts\/import-roads-to-db\.ts"/);
});

test("the app reads roads from the database first and the area's file second", () => {
  const loader = read("src/lib/road-lines-server.ts");
  assert.ok(loader.indexOf("prisma.roadLine.findMany") < loader.indexOf("readFile(activeRoadsPath()"), "database first");
  assert.doesNotMatch(loader, /writeFile/);
  assert.match(read("src/app/api/v2/road-lines/route.ts"), /loadActiveRoads\(\)/);
  assert.equal(ROAD_LINES_API, "/api/v2/road-lines");
  for (const file of ["src/app/api/v2/road-access-tags/route.ts", "src/app/api/v2/road-topology-quality/route.ts", "src/app/api/v2/incidents/[id]/road-candidates/route.ts"]) {
    assert.doesNotMatch(read(file), /readFile/, `${file} no longer opens the file itself`);
  }
});
