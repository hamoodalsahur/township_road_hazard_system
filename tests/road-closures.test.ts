import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLOSURE_KIND_LABELS, closureSourceProblem, closureState, endChoices, isPublic, lineMiddle, publicClosure, residentLine, roadNames,
  timeLeftLabel, untilLabel, validateClosureChange, validateClosureCreate,
} from "../src/lib/road-closures";

// Roadmap 5.1: operators close roads from an approved report or group, with a reason and a required end time.
const read = (file: string) => readFileSync(file, "utf8");
const now = new Date(2026, 10, 23, 17, 40);
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
const report = "cmws42lnx00027dd0i4zxd5fo";
const valid = { reportId: report, wayIds: ["osm-way-1", "osm-way-2", "osm-way-1"], kind: "closed", endsAt: inHours(6), reason: "Barrier confirmed on photo" };

test("a closure needs one source, real road ids, a kind, an end time within 14 days and a reason", () => {
  const ok = validateClosureCreate(valid, now);
  assert.deepEqual(ok.source, { kind: "report", id: report });
  assert.deepEqual(ok.wayIds, ["osm-way-1", "osm-way-2"], "duplicates are dropped");
  assert.equal(ok.startsAt.getTime(), now.getTime(), "starts now unless told otherwise");
  const bad: [Record<string, unknown>, RegExp][] = [
    [{ ...valid, reportId: undefined }, /Invalid source/], [{ ...valid, incidentId: report }, /Invalid source/],
    [{ ...valid, reportId: "../x" }, /Invalid source id/], [{ ...valid, wayIds: [] }, /at least one road/],
    [{ ...valid, wayIds: ["road-1"] }, /Invalid road id/], [{ ...valid, wayIds: Array.from({ length: 21 }, (_, i) => `osm-way-${i}`) }, /at most 20/],
    [{ ...valid, kind: "maybe" }, /Invalid closure kind/], [{ ...valid, endsAt: undefined }, /Invalid end time/],
    [{ ...valid, endsAt: inHours(0.1) }, /at least 10 minutes/], [{ ...valid, endsAt: inHours(24 * 15) }, /at most 14 days/],
    [{ ...valid, startsAt: inHours(-1) }, /cannot be in the past/], [{ ...valid, reason: "short" }, /8 to 400/],
  ];
  for (const [input, message] of bad) assert.throws(() => validateClosureCreate(input, now), message, JSON.stringify(input).slice(0, 80));
});

test("ending needs a reason; extending needs a reason and a valid new end", () => {
  assert.deepEqual(validateClosureChange({ action: "end", reason: "Water has drained" }, { startsAt: now }, now), { action: "end", reason: "Water has drained" });
  const ext = validateClosureChange({ action: "extend", reason: "Work continues", endsAt: inHours(20) }, { startsAt: now }, now);
  assert.equal(ext.action, "extend");
  assert.throws(() => validateClosureChange({ action: "end", reason: "no" }, { startsAt: now }, now), /8 to 400/);
  assert.throws(() => validateClosureChange({ action: "extend", reason: "Work continues", endsAt: inHours(24 * 20) }, { startsAt: now }, now), /14 days/);
  assert.throws(() => validateClosureChange({ action: "delete", reason: "Work continues" }, { startsAt: now }, now), /end or extend/);
});

test("only approved reports and open groups with an approved report can close roads", () => {
  assert.equal(closureSourceProblem({ kind: "report", reviewState: "corroborated" }), null);
  assert.match(closureSourceProblem({ kind: "report", reviewState: "unverified" }) ?? "", /Only approved/);
  assert.match(closureSourceProblem({ kind: "report", reviewState: "rejected" }) ?? "", /Only approved/);
  assert.equal(closureSourceProblem({ kind: "incident", status: "under_review", reviewStates: ["unverified", "corroborated"] }), null);
  assert.match(closureSourceProblem({ kind: "incident", status: "under_review", reviewStates: ["unverified"] }) ?? "", /Approve at least one/);
  assert.match(closureSourceProblem({ kind: "incident", status: "resolved", reviewStates: ["corroborated"] }) ?? "", /resolved/);
});

test("a closure is upcoming, active, past its end time or ended; residents see only active ones", () => {
  const c = { startsAt: inHours(-1), endsAt: inHours(2), endedAt: null };
  assert.equal(closureState(c, now), "active");
  assert.equal(closureState({ ...c, startsAt: inHours(1) }, now), "upcoming");
  assert.equal(closureState({ ...c, endsAt: inHours(-0.5) }, now), "past_end");
  assert.equal(closureState({ ...c, endedAt: inHours(-0.2) }, now), "ended");
  assert.equal(isPublic(c, now), true);
  assert.equal(isPublic({ ...c, startsAt: inHours(1) }, now), false, "upcoming ones are for operators only (owner's choice)");
  assert.equal(isPublic({ ...c, endsAt: inHours(-0.5) }, now), false, "an end time that passed hides it without anyone acting");
  assert.equal(timeLeftLabel(c, now), "Ends in 2h 0m");
  assert.equal(timeLeftLabel({ ...c, endsAt: inHours(-40 / 60) }, now), "End time passed 40 min ago");
  assert.equal(timeLeftLabel({ ...c, startsAt: new Date(2026, 10, 23, 21, 0).toISOString() }, now), "Starts 21:00");
});

test("the public view has no reason, operator, source ids or notes", () => {
  const pub = publicClosure({ id: "c1", kind: "closed", endsAt: inHours(6), category: "road_obstruction", reason: "secret", reportId: report, createdBy: "OP",
    roads: [{ wayId: "osm-way-1", name: "Jalan Zapin 5B", coordinates: [[1, 2], [3, 4]] }] } as never);
  assert.deepEqual(Object.keys(pub).sort(), ["categoryLabel", "category", "endsAt", "id", "kind", "kindLabel", "roads", "title"].sort());
  assert.equal(JSON.stringify(pub).includes("secret"), false);
  assert.equal(pub.kindLabel, CLOSURE_KIND_LABELS.closed);
  const api = read("src/app/api/v2/closures/public/route.ts");
  assert.match(api, /select: \{ id: true, kind: true, endsAt: true, category: true, roads:/, "the database query itself leaves the reason out");
  assert.match(api, /endedAt: null, startsAt: \{ lte: now \}, endsAt: \{ gt: now \}/);
});

test("words residents and operators read", () => {
  assert.equal(roadNames(["Jalan A"]), "Jalan A");
  assert.equal(roadNames(["Jalan A", "Jalan B"]), "Jalan A and Jalan B");
  assert.equal(roadNames(["Jalan A", "Jalan B", "Jalan C", "Unnamed mapped road"]), "Jalan A, Jalan B and 2 more roads");
  assert.equal(roadNames(["Unnamed mapped road"]), "1 unnamed road");
  assert.equal(untilLabel(new Date(2026, 10, 23, 23, 40), now), "until 23:40");
  assert.equal(untilLabel(new Date(2026, 10, 24, 9, 0), now), "until tomorrow 09:00");
  assert.equal(residentLine({ title: "Jalan A", kind: "one_lane", endsAt: new Date(2026, 10, 23, 23, 40).toISOString(), categoryLabel: "Blocked road" }, now), "Jalan A down to one lane until 23:40 · Blocked road");
  assert.deepEqual(endChoices(now).map(c => c.label), ["2 hours", "6 hours", "Tomorrow 09:00"]);
  assert.equal(endChoices(now)[2].at.getHours(), 9);
  assert.deepEqual(lineMiddle([[0, 0], [1, 1], [2, 2]]), [1, 1]);
  assert.equal(lineMiddle([]), null);
});

test("the database tables come from a committed migration, and closures keep a copy of each road", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model RoadClosure \{[\s\S]*endsAt\s+DateTime\n[\s\S]*@@map\("road_closures"\)/, "the end time is required");
  assert.match(schema, /model RoadClosureRoad \{[\s\S]*coordinates Json[\s\S]*@@map\("road_closure_roads"\)/);
  const sql = read("prisma/migrations/20261124000000_road_closures/migration.sql");
  assert.match(sql, /CREATE TABLE "road_closures"/);
  assert.doesNotMatch(sql, /DROP|ALTER TABLE "(?!road_closure_roads)/, "only adds tables");
});

test("the operator API checks access, the source, the roads, open closures, and audits every change", () => {
  const api = read("src/app/api/v2/closures/route.ts");
  assert.match(api, /canUseDemoOperatorApi\(request\)/);
  assert.match(api, /closureSourceProblem\(/);
  assert.match(api, /tx\.roadLine\.findMany\(\{ where: \{ areaId, wayId: \{ in: data\.wayIds \} \}/, "roads must be in the database for the active area");
  assert.match(api, /already in an open closure/);
  assert.match(api, /action: "v2_road_closure_created"/);
  const change = read("src/app/api/v2/closures/[id]/route.ts");
  assert.match(change, /canUseDemoOperatorApi\(request\)/);
  assert.match(change, /"v2_road_closure_ended" : "v2_road_closure_extended"/);
  assert.match(change, /already ended/);
});

test("closures appear on the resident map, its list and management Maps, and operators close roads from reports and groups", () => {
  assert.match(read("src/components/resident/ResidentMapPage.tsx"), /useClosures\(\)/);
  assert.match(read("src/components/resident/ResidentMap.tsx"), /<ClosureLines closures=\{closures\}/);
  assert.match(read("src/components/maps/GeographicReferenceMap.tsx"), /<ClosureLines closures=\{closures\} \/>/);
  assert.match(read("src/components/management/V2HazardManager.tsx"), /selectedReport\.reviewState === "corroborated" && !selectedReport\.resolvedAt \? <>\s*<Button variant="secondary" onClick=\{\(\) => setClosing\(true\)\}>/);
  assert.match(read("src/components/management/IncidentManager.tsx"), /closureSourceProblem\(\{ kind: "incident"/);
  assert.match(read("src/components/management/pages/IncidentsPage.tsx"), /<RoadClosuresPanel operatorKey=\{operatorKey\}/);
  const lines = read("src/components/closures/ClosureLines.tsx");
  assert.match(lines, /closures-dash/, "closed roads have a dashed white centre, not colour alone");
  assert.match(read("src/components/closures/CloseRoadsDialog.tsx"), /Nearest roads/, "roads can be chosen without the map");
});
