import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { MANAGEMENT_SECTIONS } from "../src/lib/management-sections";

const read = (file: string) => readFileSync(file, "utf8");

test("operators can delete a report: one transaction removes its closures, group link and resolution, then the report", () => {
  const api = read("src/app/api/v2/hazards/[id]/route.ts");
  assert.match(api, /export async function DELETE/);
  assert.match(api, /canUseDemoOperatorApi\(request\)/);
  const order = ["roadClosure.deleteMany", "incidentReportLink.deleteMany", "reportResolution.deleteMany", "hazardReport.delete(", "v2_report_deleted"].map(s => api.indexOf(s));
  assert.ok(order.every(i => i > 0), "every step is there");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "in that order (the group link blocks deleting the report)");
  assert.doesNotMatch(api, /detail: `[^`]*description/, "the audit line never copies the report text");
  assert.match(read("prisma/schema.prisma"), /report\s+HazardReport @relation\(fields: \[reportId\], references: \[id\], onDelete: Cascade\)/, "the photo goes with the report");
});

test("the review desk asks before deleting and says what goes with it", () => {
  const desk = read("src/components/management/V2HazardManager.tsx");
  assert.match(desk, /<DeleteReportDialog open=\{deleting\}/);
  const dialog = read("src/components/management/DeleteReportDialog.tsx");
  assert.match(dialog, /method: "DELETE"/);
  assert.match(dialog, /can’t be undone/);
  assert.match(dialog, /photo and any road closures/);
});

test("AI & Research is gone from the operator menu and its page", () => {
  assert.equal(MANAGEMENT_SECTIONS.some(s => s.href === "/management/research"), false);
  assert.equal(existsSync("src/app/management/research/page.tsx"), false);
  assert.doesNotMatch(read("src/components/management/SystemOverview.tsx"), /management\/research/);
});
