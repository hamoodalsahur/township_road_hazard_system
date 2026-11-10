import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCompactSource } from "./source-helpers";

const overview = readCompactSource("src/components/management/pages/OverviewPage.tsx");
const plain = readFileSync("src/components/management/pages/OverviewPage.tsx", "utf8");

test("the Overview puts decisions first and drops the duplicate shortcuts", () => {
  const needs = plain.indexOf("Needs your decision");
  assert.ok(needs > 0);
  assert.ok(needs < plain.indexOf("Incident groups under review"));
  assert.ok(needs < plain.indexOf("Recent reports"));
  assert.doesNotMatch(plain, /Quick actions/); // the sidebar already has these links
  assert.match(overview, /decisionQueue\(data\.reports/);
  assert.match(overview, /overviewSummary\(/);
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
