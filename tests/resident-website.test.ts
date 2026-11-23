import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EMPTY_DRAFT, MY_REPORTS_KEY, MY_REPORTS_LIMIT, RESIDENT_CATEGORIES, RESIDENT_IMPACTS, addStoredReport, agoLabel, parseStatusIds,
  parseStoredReports, residentLifecycle, residentStateLabel, residentStatusLine, sentLabel, stepProblem, submissionBody, type ReportDraft,
} from "../src/lib/resident-reports";
import { HAZARD_CATEGORIES } from "../src/lib/demo-hazards";
import { IMPACT_OPTIONS } from "../src/lib/v2-hazard-validation";

// Roadmap step 4.3: the resident website (map, report in three steps, My reports) in Night Desk.
const read = (file: string) => readFileSync(file, "utf8");
const id = (n: number) => `cmws42lkm0000${String(n).padStart(4, "0")}dd0f3pcbujc`;
const full: ReportDraft = { category: "flooding", impact: "partial_obstruction", location: [101.43, 3.08], locationInside: true, description: "Water across both lanes" };

test("every category and impact the server accepts can be chosen, in resident words", () => {
  assert.deepEqual(RESIDENT_CATEGORIES.map(c => c.value).sort(), [...HAZARD_CATEGORIES].sort());
  assert.deepEqual(RESIDENT_IMPACTS.map(i => i.value).sort(), [...IMPACT_OPTIONS].sort());
  assert.equal(RESIDENT_CATEGORIES.find(c => c.value === "other")?.label, "Something else");
  assert.equal(RESIDENT_IMPACTS.at(-1)?.label, "Not sure");
});

test("each step says what is missing before moving on", () => {
  assert.match(stepProblem(1, EMPTY_DRAFT) ?? "", /type of problem/);
  assert.match(stepProblem(1, { ...EMPTY_DRAFT, category: "pothole" }) ?? "", /cars can get through/);
  assert.equal(stepProblem(1, full), null);
  assert.match(stepProblem(2, { ...full, location: null }) ?? "", /pin sits on the problem/);
  assert.match(stepProblem(2, { ...full, locationInside: false }) ?? "", /outside the area/);
  assert.equal(stepProblem(2, full), null);
  assert.match(stepProblem(3, { ...full, description: "  short " }) ?? "", /at least 8/);
  assert.match(stepProblem(3, { ...full, description: "x".repeat(401) }) ?? "", /under 400/);
  assert.equal(stepProblem(3, full), null);
});

test("nothing is sent until all three steps are complete, and the body matches the existing API", () => {
  assert.equal(submissionBody({ ...full, locationInside: false }), null);
  assert.deepEqual(submissionBody({ ...full, description: "  Water across both lanes  " }),
    { category: "flooding", impact: "partial_obstruction", description: "Water across both lanes", coordinates: [101.43, 3.08] });
});

test("My reports keeps ids only, newest first, without duplicates, and survives bad storage", () => {
  assert.deepEqual(parseStoredReports(null), []);
  assert.deepEqual(parseStoredReports("{not json"), []);
  assert.deepEqual(parseStoredReports(JSON.stringify({ id: id(1) })), [], "an object instead of a list is ignored");
  const sentAt = "2026-11-23T08:13:00.000Z";
  const parsed = parseStoredReports(JSON.stringify([
    { id: id(1), category: "flooding", impact: "caution", sentAt }, { id: id(1), category: "x", impact: "y", sentAt },
    { id: "<script>", category: "flooding", impact: "caution", sentAt }, { id: id(2), sentAt: "yesterday" }, { id: id(3), sentAt },
  ]));
  assert.deepEqual(parsed.map(r => r.id), [id(1), id(3)]);
  assert.equal(parsed[1].category, "other", "missing fields get safe defaults");
  const list = addStoredReport(parsed, { id: id(3), category: "pothole", impact: "caution", sentAt });
  assert.deepEqual(list.map(r => r.id), [id(3), id(1)]);
  const many = Array.from({ length: 60 }, (_, n) => ({ id: id(n), category: "pothole", impact: "caution", sentAt }));
  assert.equal(addStoredReport(many, { id: id(99), category: "pothole", impact: "caution", sentAt }).length, MY_REPORTS_LIMIT);
  assert.equal(MY_REPORTS_KEY, "laluan.myReports.v1");
});

test("the status lookup accepts up to 50 well-formed ids and nothing else", () => {
  assert.deepEqual(parseStatusIds(`${id(1)}, ${id(2)},${id(1)}`), [id(1), id(2)]);
  assert.equal(parseStatusIds(null), null);
  assert.equal(parseStatusIds(""), null);
  assert.equal(parseStatusIds(`${id(1)},../../etc`), null);
  assert.equal(parseStatusIds(Array.from({ length: 51 }, (_, n) => id(n)).join(",")), null);
});

test("residents read the lifecycle in their own words, with 'Could not confirm' for rejected", () => {
  const at = "2026-11-23T08:00:00.000Z";
  assert.match(residentStatusLine({ id: id(1), reviewState: "unverified", incidentStatus: null, updatedAt: at }), /Being checked/);
  assert.match(residentStatusLine({ id: id(1), reviewState: "corroborated", incidentStatus: null, updatedAt: at }), /Confirmed/);
  assert.match(residentStatusLine({ id: id(1), reviewState: "corroborated", incidentStatus: "resolved", updatedAt: at }), /^Resolved/);
  assert.match(residentStatusLine({ id: id(1), reviewState: "rejected", incidentStatus: null, updatedAt: at }), /^Could not confirm/);
  assert.match(residentStatusLine(null), /Not found/);
  const rejected = residentLifecycle({ id: id(1), reviewState: "rejected", incidentStatus: null, updatedAt: at });
  assert.equal(rejected.labels[rejected.current], "Could not confirm");
  assert.equal(rejected.rejected, true);
  assert.equal(residentLifecycle({ id: id(1), reviewState: "corroborated", incidentStatus: "resolved", updatedAt: at }).current, 3);
  assert.equal(residentStateLabel("corroborated"), "Confirmed");
  assert.equal(residentStateLabel("unverified"), "Being checked");
});

test("dates read naturally", () => {
  const now = new Date(2026, 10, 23, 16, 30);
  assert.equal(sentLabel(new Date(2026, 10, 23, 9, 5).toISOString(), now), "Sent today 09:05");
  assert.equal(sentLabel(new Date(2026, 10, 22, 23, 0).toISOString(), now), "Sent yesterday");
  assert.equal(sentLabel(new Date(2026, 10, 19, 12, 0).toISOString(), now), "Sent Thursday");
  assert.equal(sentLabel(new Date(2026, 10, 2, 12, 0).toISOString(), now), "Sent 2 Nov");
  const t = Date.parse("2026-11-23T08:00:00Z");
  assert.equal(agoLabel("2026-11-23T08:00:00Z", t + 20_000), "Just now");
  assert.equal(agoLabel("2026-11-23T08:00:00Z", t + 7 * 60000), "7 min ago");
  assert.equal(agoLabel("2026-11-23T08:00:00Z", t + 90 * 60000), "1 h ago");
  assert.equal(agoLabel("2026-11-23T08:00:00Z", t + 30 * 3600000), "Yesterday");
});

test("the status API returns public fields only", () => {
  const api = read("src/app/api/v2/hazards/status/route.ts");
  assert.match(api, /parseStatusIds\(/);
  assert.match(api, /sourceMode: "simulation"/);
  const select = api.slice(api.indexOf("select: {"), api.indexOf("});", api.indexOf("select: {")));
  assert.match(select, /reviewState: true/);
  assert.doesNotMatch(select, /reviewNote|description|evidence|base64|latitude|longitude/, "no note, text, photo or location");
});

test("the resident site has three pages in the Night Desk frame, and the simulation has left it", () => {
  assert.match(read("src/app/resident/layout.tsx"), /<ResidentShell>/);
  const shell = read("src/components/resident/ResidentShell.tsx");
  for (const label of ['label: "Map"', 'label: "Report"', 'label: "My reports"']) assert.ok(shell.includes(label), label);
  assert.match(shell, /bg-night-bar/);
  assert.match(shell, /\{focused \? null : <nav aria-label="Resident pages"/, "the report steps hide the phone tab bar");
  const page = read("src/app/resident/page.tsx");
  assert.doesNotMatch(page, /DemoController|MapWorkspace|ConnectivityPanel|ReportWorkspace|PrototypeNotice/);
  assert.match(read("src/app/resident/report/page.tsx"), /<ResidentReportFlow \/>/);
  assert.match(read("src/app/resident/mine/page.tsx"), /<ResidentMyReports \/>/);
});

test("the map shows only reports inside the area and says they are fictional", () => {
  const map = read("src/components/resident/ResidentMapPage.tsx");
  assert.match(map, /isInsideServiceArea\(serviceArea\.area, r\.longitude, r\.latitude\)/);
  assert.match(map, /Fictional demo reports\. They are not live road conditions and are not directions\./);
  assert.match(map, /Pins with a ring are still being checked/);
});

test("location is only asked for on the button, and never stored", () => {
  const flow = read("src/components/resident/ResidentReportFlow.tsx");
  assert.equal(flow.match(/getCurrentPosition/g)?.length, 1);
  assert.ok(flow.indexOf("function useMyLocation") < flow.indexOf("getCurrentPosition"), "inside the button's handler");
  assert.match(flow, /onClick=\{useMyLocation\}/);
  const stored = read("src/lib/resident-reports.ts").match(/export type StoredReport = \{[^}]*\}/)?.[0] ?? "";
  assert.doesNotMatch(stored, /location|coordinates|latitude|longitude|description/, "My reports keeps no place and no text");
  assert.match(flow, /localStorage\.setItem\(MY_REPORTS_KEY/);
  assert.match(flow, /fetch\("\/api\/v2\/hazards", \{ method: "POST"/);
});

test("resident screens follow the Night Desk type rules", () => {
  for (const file of ["src/components/resident/ResidentShell.tsx", "src/components/resident/ResidentMapPage.tsx",
    "src/components/resident/ResidentReportFlow.tsx", "src/components/resident/ResidentMyReports.tsx"]) {
    const source = read(file);
    assert.doesNotMatch(source, /\buppercase\b|font-bold|font-extrabold|lucide-react|violet-|\btext-(xs|sm|lg|xl|2xl)\b/, file);
  }
});
