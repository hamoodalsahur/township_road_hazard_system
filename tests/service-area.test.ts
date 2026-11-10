import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_SERVICE_AREA, areaBounds, areaCenter, isInsideServiceArea, parseServiceArea, serviceAreaResponse, type ServiceArea,
} from "../src/lib/service-area";
import { loadServiceAreaFrom } from "../src/lib/service-area-server";
import { validateHazardSubmission } from "../src/lib/v2-hazard-validation";
import { inspectDemoReportDraft } from "../src/lib/v213-report-draft";

const feature = (coordinates: unknown, properties: Record<string, unknown> = { id: "local", name: "Test area" }) =>
  ({ type: "Feature", properties, geometry: { type: "Polygon", coordinates } });
const square = (west: number, south: number, size: number) =>
  [[[west, south], [west + size, south], [west + size, south + size], [west, south + size], [west, south]]];

test("the committed BBR file matches the built-in default exactly", () => {
  const file = parseServiceArea(JSON.parse(readFileSync("config/service-areas/bbr.geojson", "utf8")), "bbr");
  assert.deepEqual(file, DEFAULT_SERVICE_AREA);
  assert.deepEqual(areaBounds(DEFAULT_SERVICE_AREA), { west: 101.40, south: 3.06, east: 101.47, north: 3.11 });
  const [lon, lat] = areaCenter(DEFAULT_SERVICE_AREA);
  assert.ok(Math.abs(lon - 101.435) < 1e-9 && Math.abs(lat - 3.085) < 1e-9);
  parseServiceArea(JSON.parse(readFileSync("config/service-areas/local.example.geojson", "utf8")), "local");
});

test("BBR answers exactly as the old rectangle did, edges included", () => {
  const old = (lon: number, lat: number) => !(lon < 101.40 || lon > 101.47 || lat < 3.06 || lat > 3.11);
  const lons = [101.3999, 101.40, 101.4001, 101.43, 101.4318, 101.4699, 101.47, 101.4701];
  const lats = [3.0599, 3.06, 3.0601, 3.0876, 3.1099, 3.11, 3.1101];
  for (const lon of lons) for (const lat of lats) {
    assert.equal(isInsideServiceArea(DEFAULT_SERVICE_AREA, lon, lat), old(lon, lat), `${lon}, ${lat}`);
  }
  assert.equal(isInsideServiceArea(DEFAULT_SERVICE_AREA, Number.NaN, 3.08), false);
});

test("polygons with holes and odd shapes work", () => {
  const withHole = parseServiceArea(feature([square(101, 3, 0.1)[0], square(101.04, 3.04, 0.02)[0]]));
  assert.equal(isInsideServiceArea(withHole, 101.02, 3.02), true);
  assert.equal(isInsideServiceArea(withHole, 101.05, 3.05), false); // inside the hole
  assert.equal(isInsideServiceArea(withHole, 101.04, 3.05), true); // on the hole's edge
  const triangle = parseServiceArea(feature([[[101, 3], [101.1, 3], [101, 3.1], [101, 3]]]));
  assert.equal(isInsideServiceArea(triangle, 101.02, 3.02), true);
  assert.equal(isInsideServiceArea(triangle, 101.08, 3.08), false); // inside the bounds, outside the shape
});

test("broken area files are refused with a readable reason", () => {
  const reasons: [unknown, RegExp][] = [
    [null, /not a GeoJSON object/],
    [{ type: "FeatureCollection" }, /single GeoJSON "Feature"/],
    [feature(square(101, 3, 0.1), { id: "Bad Id", name: "x" }), /lowercase/],
    [feature(square(101, 3, 0.1), { id: "local", name: "" }), /name/],
    [{ ...feature(square(101, 3, 0.1)), geometry: { type: "Point", coordinates: [101, 3] } }, /Polygon/],
    [feature([[[101, 3], [101.1, 3], [101.1, 3.1], [101, 3.1]]]), /not closed/],
    [feature([[[101, 3], [101.1, 3], [101, 3]]]), /at least 4 points/],
    [feature([[[101, 3], ["x", 3], [101, 3.1], [101, 3]]]), /\[longitude, latitude\]/],
    [feature([[[200, 3], [201, 3], [201, 4], [200, 3]]]), /outside valid/],
    [feature(square(101, 3, 1)), /larger than 60 km/],
    [feature(square(101, 3, 0.0001)), /too small/],
  ];
  for (const [input, reason] of reasons) assert.throws(() => parseServiceArea(input), reason);
  assert.throws(() => parseServiceArea(feature(square(101, 3, 0.1), { id: "other", name: "x" }), "local"), /file is for "local"/);
});

test("the server loader falls back to BBR and says why", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "service-area-"));
  assert.deepEqual(loadServiceAreaFrom(dir, undefined), { area: DEFAULT_SERVICE_AREA, configuredId: "bbr", fallbackReason: null });
  assert.match(loadServiceAreaFrom(dir, "local").fallbackReason ?? "", /local\.geojson was not found/);
  assert.match(loadServiceAreaFrom(dir, "../../etc/passwd").fallbackReason ?? "", /not a valid name/);
  writeFileSync(path.join(dir, "broken.geojson"), "{ not json");
  assert.match(loadServiceAreaFrom(dir, "broken").fallbackReason ?? "", /could not be used/);
  writeFileSync(path.join(dir, "local.geojson"), JSON.stringify(feature(square(101.5, 2.9, 0.05))));
  const local = loadServiceAreaFrom(dir, " local ");
  assert.equal(local.fallbackReason, null);
  assert.equal(local.area.name, "Test area");
  assert.equal(loadServiceAreaFrom(path.resolve("config/service-areas"), "bbr").fallbackReason, null);
});

test("report checks follow the active area on the server and in the browser", () => {
  const elsewhere: ServiceArea = parseServiceArea(feature(square(101.5, 2.9, 0.05)));
  const report = { category: "flooding", description: "Water across the road", impact: "caution" };
  assert.doesNotThrow(() => validateHazardSubmission({ ...report, coordinates: [101.4318, 3.0876] }));
  assert.throws(() => validateHazardSubmission({ ...report, coordinates: [101.52, 2.92] }), /inside the service area \(Bandar Bukit Raja/);
  assert.doesNotThrow(() => validateHazardSubmission({ ...report, coordinates: [101.52, 2.92] }, elsewhere));
  assert.throws(() => validateHazardSubmission({ ...report, coordinates: [101.4318, 3.0876] }, elsewhere), /Test area/);
  assert.equal(inspectDemoReportDraft("Water across the road", [101.52, 2.92], null).locationError?.includes("service area"), true);
  assert.equal(inspectDemoReportDraft("Water across the road", [101.52, 2.92], null, elsewhere).locationError, null);
  assert.equal(serviceAreaResponse(elsewhere, "local", null).bounds.west, 101.5);
});

test("no part of the app keeps its own copy of the BBR rectangle", () => {
  const files: string[] = [];
  const walk = (dir: string) => readdirSync(dir).forEach(name => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(name) && !full.endsWith(path.join("lib", "service-area.ts"))) files.push(full);
  });
  walk("src");
  for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /101\.40\b|101\.47\b/, file);
  const route = readFileSync("src/app/api/v2/hazards/route.ts", "utf8");
  assert.match(route, /validateHazardSubmission\(body,loadServiceArea\(\)\.area\)/);
});

test("personal areas stay out of Git and the setting stays server-side", () => {
  const ignore = readFileSync(".gitignore", "utf8");
  assert.match(ignore, /^\/config\/service-areas\/\*\.geojson$/m);
  assert.match(ignore, /^!\/config\/service-areas\/bbr\.geojson$/m);
  const example = readFileSync(".env.example", "utf8");
  assert.match(example, /^# SERVICE_AREA="local"$/m);
  assert.doesNotMatch(example, /NEXT_PUBLIC_SERVICE_AREA/);
});
