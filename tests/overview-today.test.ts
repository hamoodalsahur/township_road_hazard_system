import test from "node:test";
import assert from "node:assert/strict";
import {
  auditKind, decisionsSince, parseSince, reviewHeadline, shiftLog, startOfLocalDay, timelineHours, timelinePosition,
  timelineTicks, todayLine, waitingSince,
} from "../src/lib/overview-today";
import { fitView, project, projectPercent, viewRoadPaths } from "../src/lib/overview-map";
import { contrastRatio } from "../src/lib/design-tokens";
import type { RoadFeature } from "../src/lib/bbr-roads";

// Night Desk Overview and Incidents (roadmap 4.2b, with the adopted points from the UI/UX handoff).
const HOUR = 3600_000;
const midnight = startOfLocalDay(Date.parse("2026-11-21T12:00:00"));
const at = (h: number, m = 0) => new Date(midnight + h * HOUR + m * 60_000).toISOString();

test("the header says how many reports need review in plain words", () => {
  assert.equal(reviewHeadline(3), "3 reports need review");
  assert.equal(reviewHeadline(1), "1 report needs review");
  assert.equal(reviewHeadline(0), "Nothing waiting for review");
  assert.equal(todayLine({ received: 5, approved: 2, rejected: 1 }), "Today: 5 received, 2 approved, 1 rejected");
  assert.equal(todayLine({ received: null, approved: 0, rejected: 0 }), "Today: 0 approved, 0 rejected");
});

test("the oldest report says since when it has waited", () => {
  const now = midnight + 16 * HOUR;
  assert.equal(waitingSince(at(14, 45), now), "since 14:45");
  assert.equal(waitingSince(at(-3), now), "since yesterday");
  assert.match(waitingSince(at(-50), now), /^since [A-Z][a-z]+day$/);
  assert.equal(waitingSince("not a date", now), "");
});

test("decisions are counted from the audit log, only since midnight", () => {
  const entries = [
    { id: "1", action: "v2_demo_hazard_review", subjectId: "r1", detail: "Decision: corroborated; public demo photo approved: false. ok", createdAt: at(9) },
    { id: "2", action: "v2_demo_hazard_review", subjectId: "r2", detail: "Decision: rejected; public demo photo approved: false. dup", createdAt: at(10) },
    { id: "3", action: "v2_demo_hazard_review", subjectId: "r3", detail: "Decision: corroborated; yesterday", createdAt: at(-2) },
    { id: "4", action: "v2_demo_incident_created", subjectId: "g1", detail: "Created", createdAt: at(11) },
    { id: "5", action: "something_else", subjectId: "x", detail: "Decision: corroborated", createdAt: at(12) },
  ];
  assert.deepEqual(decisionsSince(entries, midnight), { approved: 1, rejected: 1 });
  assert.equal(auditKind(entries[3]), "grouped");
  assert.equal(auditKind(entries[4]), null, "only review entries count as decisions");
});

test("the shift log mixes new reports and decisions, newest first", () => {
  const reports = [{ id: "r1", category: "flooding", createdAt: at(8) }, { id: "r4", category: "fallen_tree", createdAt: at(15) }];
  const entries = [
    { id: "1", action: "v2_demo_hazard_review", subjectId: "r1", detail: "Decision: corroborated; x", createdAt: at(9) },
    { id: "2", action: "v2_demo_hazard_review", subjectId: "gone", detail: "Decision: rejected; x", createdAt: at(10) },
  ];
  const log = shiftLog(reports, entries, 4);
  assert.deepEqual(log.map(item => item.title), ["New report", "Rejected", "Approved", "New report"]);
  assert.equal(log[1].detail, "A report", "rejected reports are not in the feed, so their category is unknown");
  assert.equal(log[2].detail, "Flooding");
  assert.equal(shiftLog(reports, entries, 2).length, 2);
});

test("the timeline covers 06:00 to 22:00 and stretches for late or early reports", () => {
  assert.deepEqual(timelineHours([at(9), at(14)], midnight), { from: 6, to: 22 });
  assert.deepEqual(timelineHours([at(4, 30), at(22, 40)], midnight), { from: 4, to: 23 });
  const range = { from: 6, to: 22 };
  assert.equal(timelinePosition(at(6), midnight, range), 0);
  assert.equal(timelinePosition(at(14), midnight, range), 50);
  assert.equal(timelinePosition(at(23), midnight, range), null);
  assert.deepEqual(timelineTicks(range, 4).map(t => t.label), ["08:00", "12:00", "16:00", "20:00"]);
  assert.equal(timelineTicks(range, 2)[0].label, "06:00");
});

test("the oversight API only accepts a recent ?since= time", () => {
  const now = Date.parse("2026-11-21T16:00:00Z");
  assert.ok(parseSince("2026-11-20T16:00:00.000Z", now));
  assert.equal(parseSince(null, now), null);
  assert.equal(parseSince("yesterday", now), null);
  assert.equal(parseSince("2026-11-22T00:00:00Z", now), null, "not in the future");
  assert.equal(parseSince("2026-11-10T00:00:00Z", now), null, "not more than two days back");
});

test("the Overview map fits every report and keeps north up", () => {
  const points = [{ longitude: 101.426, latitude: 3.080 }, { longitude: 101.439, latitude: 3.089 }];
  const view = fitView(points, 560, 560, 56)!;
  for (const p of points) {
    const { x, y } = project(view, p.longitude, p.latitude);
    assert.ok(x >= 56 - 0.01 && x <= 504 + 0.01 && y >= 56 - 0.01 && y <= 504 + 0.01, "inside the padded box");
  }
  assert.ok(project(view, 101.43, 3.09).y < project(view, 101.43, 3.08).y, "north is up");
  const single = fitView([points[0]], 560, 560)!;
  assert.deepEqual(projectPercent(single, 101.426, 3.080), { left: 50, top: 50 });
  assert.equal(fitView([], 560, 560), null);
  const road = (id: string, coords: [number, number][]): RoadFeature => ({ type: "Feature",
    properties: { id, name: "", highway: "primary", sourceUrl: "", verification: "osm_unverified" }, geometry: { type: "LineString", coordinates: coords } });
  const paths = viewRoadPaths([road("near", [[101.43, 3.085], [101.431, 3.086]]), road("far", [[102, 4], [102.1, 4.1]])], view);
  assert.deepEqual(paths.map(p => p.id), ["near"]);
  assert.equal(paths[0].major, true);
});

test("the review blue reads on its tint and on white", () => {
  assert.ok(contrastRatio("#1F5A94", "#E8F0FB") >= 4.5);
  assert.ok(contrastRatio("#1F5A94", "#FFFFFF") >= 4.5);
});
