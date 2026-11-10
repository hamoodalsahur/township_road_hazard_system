import test from "node:test";
import assert from "node:assert/strict";
import {
  SEVERITY, severityOf, highestSeverity, reviewStateOf, lifecycleOf, formatAge, formatAgeLong, incidentStatusLabel, categoryLabel,
} from "../src/lib/hazard-presentation";
import {
  nextReportAfterDecision, moveSelection, reviewShortcut, reasonIsValid, decisionMessage,
} from "../src/lib/incident-review-queue";
import { contrastRatio } from "../src/lib/design-tokens";

test("severity follows the stored impact and falls back to Not sure", () => {
  assert.equal(severityOf("suspected_closure").label, "Possibly closed");
  assert.equal(severityOf("partial_obstruction").label, "Partly blocked");
  assert.equal(severityOf("caution").label, "Take care");
  assert.equal(severityOf("unknown").label, "Not sure");
  assert.equal(severityOf("constructor").label, "Not sure");
  assert.equal(severityOf(undefined).label, "Not sure");
  assert.equal(highestSeverity(["caution", "suspected_closure", "partial_obstruction"]).key, "suspected_closure");
  assert.equal(highestSeverity([]).key, "unknown");
});

test("severity colours match docs/DESIGN.md and stay readable", () => {
  assert.equal(SEVERITY.suspected_closure.solid, "#B42318");
  assert.equal(SEVERITY.caution.solid, "#F2B42C");
  for (const s of Object.values(SEVERITY)) {
    assert.ok(contrastRatio(s.text, s.tint) >= 4.5, `${s.label} chip text ${contrastRatio(s.text, s.tint).toFixed(2)}`);
    assert.ok(contrastRatio(s.glyph, s.solid) >= 3, `${s.label} marker glyph`);
  }
});

test("review states and lifecycle steps", () => {
  assert.deepEqual(reviewStateOf("unverified"), { label: "Needs review", needsReview: true, markerFill: "outlined" });
  assert.equal(reviewStateOf("corroborated").markerFill, "solid");
  assert.equal(lifecycleOf("unverified").current, 1);
  assert.equal(lifecycleOf("corroborated").current, 2);
  assert.equal(lifecycleOf("corroborated", "resolved").current, 3);
  assert.deepEqual(lifecycleOf("rejected"), { current: 2, labels: ["Received", "Being checked", "Could not confirm", "Resolved"] });
  assert.equal(incidentStatusLabel("under_review"), "Under review");
  assert.equal(categoryLabel("road_obstruction"), "Blocked road");
  assert.equal(categoryLabel("mystery_thing"), "mystery thing");
});

test("ages read compactly in lists and in full in the detail", () => {
  const now = Date.parse("2026-11-10T10:00:00Z");
  assert.equal(formatAge("2026-11-10T09:59:40Z", now), "now");
  assert.equal(formatAge("2026-11-10T09:53:00Z", now), "7m");
  assert.equal(formatAge("2026-11-10T08:25:00Z", now), "1h 35m");
  assert.equal(formatAge("2026-11-10T08:00:00Z", now), "2h");
  assert.equal(formatAge("2026-11-08T09:00:00Z", now), "2d");
  assert.equal(formatAge("not a date", now), "");
  assert.equal(formatAgeLong("2026-11-10T09:53:00Z", now), "7 min ago");
  assert.equal(formatAgeLong("2026-11-10T08:25:00Z", now), "1h 35 min ago");
  assert.equal(formatAgeLong("2026-11-09T09:00:00Z", now), "1 day ago");
});

test("after a decision the next waiting report opens", () => {
  const list = [
    { id: "a", reviewState: "unverified" }, { id: "b", reviewState: "corroborated" },
    { id: "c", reviewState: "unverified" }, { id: "d", reviewState: "unverified" },
  ];
  assert.equal(nextReportAfterDecision(list, "a"), "c");
  assert.equal(nextReportAfterDecision(list, "c"), "d");
  assert.equal(nextReportAfterDecision(list, "d"), "a");
  assert.equal(nextReportAfterDecision([{ id: "a", reviewState: "unverified" }], "a"), null);
  assert.equal(nextReportAfterDecision([{ id: "x", reviewState: "unverified" }], "missing"), "x");
});

test("J and K move through the list and stop at the ends", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(moveSelection(list, "a", 1), "b");
  assert.equal(moveSelection(list, "c", 1), "c");
  assert.equal(moveSelection(list, "a", -1), "a");
  assert.equal(moveSelection(list, null, 1), "a");
  assert.equal(moveSelection(list, null, -1), "c");
  assert.equal(moveSelection([], "a", 1), null);
});

test("shortcuts never send a decision by themselves", () => {
  const key = (k: string, extra: Partial<{ inTextField: boolean; ctrlKey: boolean }> = {}) => ({ key: k, inTextField: false, ...extra });
  assert.deepEqual(reviewShortcut(key("j"), true, false), { type: "move", delta: 1 });
  assert.deepEqual(reviewShortcut(key("K"), true, false), { type: "move", delta: -1 });
  assert.deepEqual(reviewShortcut(key("a"), true, false), { type: "focus-reason" });
  assert.deepEqual(reviewShortcut(key("r"), true, true), { type: "focus-decision", decision: "reject" });
  assert.deepEqual(reviewShortcut(key("a"), true, true), { type: "focus-decision", decision: "approve" });
  assert.equal(reviewShortcut(key("a"), false, true), null);
  assert.equal(reviewShortcut(key("j", { inTextField: true }), true, true), null);
  assert.equal(reviewShortcut(key("r", { ctrlKey: true }), true, true), null);
  assert.equal(reviewShortcut(key("x"), true, true), null);
});

test("reason rule and decision messages", () => {
  assert.equal(reasonIsValid("short"), false);
  assert.equal(reasonIsValid("   seven   "), false);
  assert.equal(reasonIsValid("long enough"), true);
  assert.equal(
    decisionMessage({ category: "Flooding", decision: "corroborated", photoPublished: true, remaining: 1 }),
    "Flooding report approved. The photo will show in the resident app. 1 report left. No road status changed.",
  );
  const rejected = decisionMessage({ category: "Pothole", decision: "rejected", photoPublished: true, remaining: 0 });
  assert.match(rejected, /rejected\. Any photo stays private\. No reports left to review\./);
});
