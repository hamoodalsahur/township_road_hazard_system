import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCompactSource } from "./source-helpers";

const overview = readCompactSource("src/components/management/pages/OverviewPage.tsx");
const plain = readFileSync("src/components/management/pages/OverviewPage.tsx", "utf8");

test("the Overview puts decisions first and drops the duplicate shortcuts", () => {
  const needs = plain.indexOf("Needs your decision");
  assert.ok(needs > 0);
  assert.ok(needs < plain.indexOf("Groups under review"));
  assert.ok(needs < plain.indexOf("Shift log"));
  assert.doesNotMatch(plain, /Quick actions/); // the top bar already has these links
  assert.match(overview, /decisionQueue\(data\.reports/);
  // Night Desk header: a short headline, today's counts, and the oldest report on its own.
  assert.match(overview, /title=\{queue\?reviewHeadline\(queue\.total\)/);
  assert.match(overview, /todayLine\(/);
  assert.match(plain, /Oldest report/);
  assert.match(overview, /below=\{data\?\.today\?<TodayTimeline/);
});

test("cards, timeline and map share one selection", () => {
  assert.match(overview, /<OverviewMap reports=\{mapReports\}selectedId=\{selectedId\}onSelect=\{select\}/);
  assert.match(overview, /<TodayTimeline [^>]*selectedId=\{selectedId\}onSelect=\{select\}\/>/);
  assert.match(overview, /aria-pressed=\{selected\}/);
  // Each card still has its own way into Incidents, separate from selecting it.
  assert.match(overview, />Review report<CaretRightIcon/);
});

test("rows open the exact report or group in Incidents", () => {
  assert.match(overview, /href=\{reportLink\(report\.id\)\}/);
  assert.match(overview, /href=\{groupLink\(group\.id\)\}/);
  const reports = readCompactSource("src/components/management/V2HazardManager.tsx");
  const groups = readCompactSource("src/components/management/IncidentManager.tsx");
  assert.match(reports, /requestedId\(window\.location\.search,"report"\)/);
  assert.match(groups, /requestedId\(window\.location\.search,"incident"\)/);
  assert.match(reports, /firstLoadRef/); // only on the first load, so later refreshes keep the operator's choice
});

test("a failed refresh hides old figures, and missing photo info does not block the page", () => {
  assert.match(overview, /setData\(null\)/);
  assert.match(overview, /\/api\/v2\/evidence-states.*\.catch\(\(\)=>null\)/);
  assert.match(overview, /role="alert"/);
});

test("Overview and its advanced panels avoid hazard colours for decoration", () => {
  for (const path of ["src/components/management/pages/OverviewPage.tsx", "src/components/management/ReviewAgeQueue.tsx", "src/components/management/OperatorAuditSummary.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /amber-|lucide-react|font-bold|font-extrabold/, path);
  }
});
