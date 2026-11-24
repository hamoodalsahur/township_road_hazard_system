import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { includeResolved, resolveProblem, resolvedMessage, validateResolveNote, DEFAULT_RESOLVE_NOTE } from "../src/lib/report-resolution";
import { residentLifecycle, residentStatusLine } from "../src/lib/resident-reports";

const read = (file: string) => readFileSync(file, "utf8");

test("a note of 8 to 400 characters is needed; the default note is long enough", () => {
  assert.deepEqual(validateResolveNote({ note: "  Tree removed by the council  " }), { note: "Tree removed by the council" });
  assert.throws(() => validateResolveNote({ note: "done" }), /at least 8/);
  assert.throws(() => validateResolveNote({ note: "x".repeat(401) }), /at most 400/);
  assert.throws(() => validateResolveNote(null), /at least 8/);
  assert.ok(validateResolveNote({ note: DEFAULT_RESOLVE_NOTE }));
});

test("only an approved, not yet resolved demo report can be marked cleared", () => {
  assert.equal(resolveProblem({ sourceMode: "simulation", reviewState: "corroborated" }, false), null);
  assert.equal(resolveProblem(null, false)?.status, 404);
  assert.equal(resolveProblem({ sourceMode: "archived_other_area", reviewState: "corroborated" }, false)?.status, 404);
  assert.match(resolveProblem({ sourceMode: "simulation", reviewState: "unverified" }, false)!.error, /approved/);
  assert.match(resolveProblem({ sourceMode: "simulation", reviewState: "corroborated" }, true)!.error, /already resolved/);
});

test("the desk says how many closures ended", () => {
  assert.match(resolvedMessage("Fallen tree", 0), /^Fallen tree report resolved\. No road closure was open/);
  assert.match(resolvedMessage("Fallen tree", 1), /Its road closure has ended\./);
  assert.match(resolvedMessage("Flooding", 2), /Its 2 road closures have ended\./);
});

test("the hazards list hides resolved reports unless the desk asks for them", () => {
  assert.equal(includeResolved("http://x/api/v2/hazards"), false);
  assert.equal(includeResolved("http://x/api/v2/hazards?include=resolved"), true);
  const api = read("src/app/api/v2/hazards/route.ts");
  assert.match(api, /withResolved \|\| !resolved\.has\(x\.id\)/);
  assert.match(read("src/components/management/V2HazardManager.tsx"), /\/api\/v2\/hazards\?include=resolved/);
});

test("the resident's report shows Resolved once it is cleared", () => {
  const status = { id: "r1", reviewState: "corroborated", incidentStatus: "resolved", updatedAt: "2026-11-24T00:00:00Z" };
  assert.equal(residentLifecycle(status).current, 3);
  assert.match(residentStatusLine(status), /^Resolved/);
  assert.match(read("src/app/api/v2/hazards/status/route.ts"), /incidentStatus: resolvedAt \? "resolved"/);
});

test("the resolve API checks access, ends the report's open closures in the same transaction, and audits both", () => {
  const api = read("src/app/api/v2/hazards/[id]/resolve/route.ts");
  assert.match(api, /canUseDemoOperatorApi\(request\)/);
  assert.match(api, /prisma\.\$transaction/);
  assert.match(api, /roadClosure\.findMany\(\{ where: \{ reportId: id, endedAt: null/);
  assert.match(api, /v2_road_closure_ended/);
  assert.match(api, /v2_report_resolved/);
});

test("resolutions have their own table from a committed migration, so the copied tables keep the old shape", () => {
  const sql = read("prisma/migrations/20261125000000_report_resolutions/migration.sql");
  assert.match(sql, /CREATE TABLE "report_resolutions"/);
  assert.doesNotMatch(sql, /ALTER TABLE "hazard_reports"/);
  assert.match(read("prisma/schema.prisma"), /model ReportResolution \{/);
});
