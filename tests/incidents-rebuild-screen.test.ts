import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCompactSource } from "./source-helpers";
import { miniMapPaths, MINI_MAP_WIDTH, MINI_MAP_HEIGHT } from "../src/lib/mini-map";
import type { RoadFeature } from "../src/lib/bbr-roads";

const page = readCompactSource("src/components/management/pages/IncidentsPage.tsx");
const review = readCompactSource("src/components/management/V2HazardManager.tsx");
const groups = readCompactSource("src/components/management/IncidentManager.tsx");
const shell = readCompactSource("src/components/management/ManagementShell.tsx");

test("Incidents uses accessible tabs and keeps the old anchors working", () => {
  assert.match(page, /role="tablist"/);
  for (const id of ["report-review", "incident-groups", "simulator-reports"]) {
    assert.match(page, new RegExp(`<section id="${id}" role="tabpanel"`));
    assert.match(page, new RegExp(`aria-controls="${id}"`));
  }
  assert.match(page, /window\.location\.hash/); // /management/incidents#report-review still opens that tab
  assert.match(page, /hidden=\{tab!=="incident-groups"\}/); // panels stay mounted, so drafts survive tab switches
  assert.match(page, /ArrowRight/);
});

test("decision buttons sit in a footer that stays visible", () => {
  assert.match(review, /className="sticky bottom-0 mt-auto/);
  assert.match(groups, /className="sticky bottom-0 mt-auto/);
});

test("keyboard shortcuts go through the tested helper and never submit on their own", () => {
  assert.match(review, /reviewShortcut\(/);
  assert.match(review, /moveSelection\(/);
  assert.match(review, /\.current\?\.focus\(\)/);
  assert.doesNotMatch(review, /action\.decision==="approve"\?void review/);
  assert.match(review, /closest\("\[hidden\]"\)/); // inactive tab ignores shortcuts
});

test("after a decision the next waiting report opens and the message stays honest", () => {
  assert.match(review, /const next=nextReportAfterDecision\(visibleItems,id\)/);
  assert.match(review, /await reload\(\{id:next\}\)/);
  assert.match(review, /decisionMessage\(/);
  assert.match(review, /All caught up/);
  assert.doesNotMatch(review, /Undo/); // no way to reverse a decision exists yet
});

test("hazard visuals use Phosphor glyph markers, not emoji", () => {
  const marker = readFileSync("src/components/hazards/HazardMarker.tsx", "utf8");
  assert.match(marker, /@phosphor-icons\/react/);
  assert.doesNotMatch(marker, /HAZARD_SYMBOLS/);
  assert.match(review, /<HazardMarker/);
  assert.match(groups, /<HazardMarker/);
  assert.doesNotMatch(review + groups + shell, /lucide-react/);
});

test("green is not used for review status chips", () => {
  const chips = readFileSync("src/components/hazards/HazardChips.tsx", "utf8");
  assert.doesNotMatch(chips, /teal-|#0B7350/);
});

test("incident groups show severity from linked reports, read-only", () => {
  const route = readFileSync("src/app/api/v2/incidents/route.ts", "utf8");
  assert.match(route, /report:\{select:\{category:true,description:true,reviewState:true,createdAt:true,impact:true\}\}/);
  assert.match(groups, /highestSeverity\(/);
});

test("shell badge counts reports waiting for review and refreshes after decisions", () => {
  assert.match(shell, /reviewState==="unverified"/);
  assert.match(shell, /addEventListener\("township-hazards-updated"/);
  assert.match(shell, /reports need/);
});

test("mini map draws only roads near the report", () => {
  const road = (id: string, coordinates: [number, number][]): RoadFeature => ({
    type: "Feature", geometry: { type: "LineString", coordinates },
    properties: { id, name: id, highway: id === "osm-way-1" ? "primary" : "residential", sourceUrl: "https://www.openstreetmap.org/way/1", verification: "osm_unverified" },
  });
  const paths = miniMapPaths([
    road("osm-way-1", [[101.4310, 3.0876], [101.4326, 3.0876]]),
    road("osm-way-2", [[101.50, 3.10], [101.51, 3.11]]),
  ], 101.4318, 3.0876);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].major, true);
  // The report point sits in the centre of the drawing.
  assert.match(paths[0].d, new RegExp(`^M\\d+\\.\\d,${(MINI_MAP_HEIGHT / 2).toFixed(1)}L\\d+\\.\\d,${(MINI_MAP_HEIGHT / 2).toFixed(1)}$`));
  const [start, end] = paths[0].d.slice(1).split("L").map(pair => Number(pair.split(",")[0]));
  assert.ok(Math.abs((start + end) / 2 - MINI_MAP_WIDTH / 2) < 0.2);
});
