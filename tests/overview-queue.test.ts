import test from "node:test";
import assert from "node:assert/strict";
import {
  decisionQueue, formatWait, groupLink, groupsUnderReview, overviewSummary, recentReports, reportLink, requestedId,
} from "../src/lib/overview-queue";

const now = Date.parse("2026-11-10T12:00:00Z");
const at = (minutesAgo: number) => new Date(now - minutesAgo * 60000).toISOString();

test("wait times read naturally", () => {
  assert.equal(formatWait(at(0.2), now), "just now");
  assert.equal(formatWait(at(7), now), "7 min");
  assert.equal(formatWait(at(95), now), "1h 35m");
  assert.equal(formatWait(at(120), now), "2h");
  assert.equal(formatWait(at(60 * 52), now), "2d 4h");
  assert.equal(formatWait(at(60 * 48), now), "2d");
  assert.equal(formatWait("nonsense", now), "");
});

test("the decision queue lists waiting reports oldest first", () => {
  const reports = [
    { id: "new", reviewState: "unverified", createdAt: at(7) },
    { id: "done", reviewState: "corroborated", createdAt: at(9000) },
    { id: "old", reviewState: "unverified", createdAt: at(60 * 52) },
    { id: "mid", reviewState: "unverified", createdAt: at(95) },
  ];
  const queue = decisionQueue(reports, 2, now);
  assert.equal(queue.total, 3);
  assert.deepEqual(queue.items.map(i => i.report.id), ["old", "mid"]);
  assert.equal(queue.more, 1);
  assert.equal(queue.oldestId, "old");
  assert.equal(queue.items[0].overADay, true);
  assert.equal(queue.items[1].overADay, false);
  assert.equal(decisionQueue([], 5, now).oldestId, null);
});

test("groups under review and recent reports", () => {
  const groups = [
    { id: "g1", status: "resolved", createdAt: at(10) },
    { id: "g2", status: "under_review", createdAt: at(30) },
    { id: "g3", status: "under_review", createdAt: at(300) },
    { id: "g4", status: "corroborated", createdAt: at(5) },
  ];
  assert.deepEqual(groupsUnderReview(groups).items.map(g => g.id), ["g3", "g2"]);
  assert.deepEqual(recentReports([{ createdAt: at(30) }, { createdAt: at(1) }, { createdAt: at(10) }], 2), [{ createdAt: at(1) }, { createdAt: at(10) }]);
});

test("one summary line replaces the four number boxes", () => {
  assert.deepEqual(overviewSummary({ needsDecision: 3, groupsUnderReview: 1, totalReports: 5, resolvedGroups: 1 }),
    ["3 reports need your decision", "1 incident group under review", "5 reports in total", "1 group resolved"]);
  assert.equal(overviewSummary({ needsDecision: 0, groupsUnderReview: 0, totalReports: 1, resolvedGroups: 0 })[0], "Nothing waiting for a decision");
  assert.equal(overviewSummary({ needsDecision: 1, groupsUnderReview: 2, totalReports: 1, resolvedGroups: 2 })[0], "1 report needs your decision");
});

test("links open one report or group, and only plain IDs are accepted back", () => {
  assert.equal(reportLink("cm3k7a91"), "/management/incidents?report=cm3k7a91#report-review");
  assert.equal(groupLink("cm3k8e10"), "/management/incidents?incident=cm3k8e10#incident-groups");
  assert.equal(requestedId("?report=cm3k7a91", "report"), "cm3k7a91");
  assert.equal(requestedId("?report=<script>", "report"), null);
  assert.equal(requestedId("?incident=abc", "report"), null);
  assert.equal(requestedId("", "incident"), null);
});
