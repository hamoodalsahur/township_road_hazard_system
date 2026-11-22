import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evidenceSummary, formatBytes, galleryCounts, galleryStatus } from "../src/lib/evidence-gallery";
import { auditActionLabel, auditCsv, auditPhotoPublished, auditReason } from "../src/lib/system-audit";

// Night Desk step 4a: Evidence, System & Audit, AI & Research and the Maps page panels.
const read = (file: string) => readFileSync(file, "utf8");

test("a photo is shown to residents only when the photo and its report are both approved", () => {
  assert.equal(galleryStatus("approved_public_demo", "corroborated"), "public");
  assert.equal(galleryStatus("approved_public_demo", "unverified"), "check", "an approved photo on an undecided report needs checking");
  assert.equal(galleryStatus("private_unreviewed", "unverified"), "waiting");
  assert.equal(galleryStatus("private_unreviewed", "corroborated"), "private", "approved report, photo not ticked: stays private");
  assert.equal(galleryStatus("private_rejected", "corroborated"), "private");
  assert.equal(galleryStatus("unknown", "unverified"), "check");
  assert.equal(galleryStatus(undefined, "unverified"), "check");
});

test("the Evidence header counts photos in plain words", () => {
  const counts = galleryCounts(["public", "public", "waiting", "private", "check"]);
  assert.deepEqual(counts, { all: 5, public: 2, waiting: 1, private: 1, check: 1 });
  assert.equal(evidenceSummary(counts), "5 photos. 2 are shown to residents, the rest stay with operators.");
  assert.equal(evidenceSummary(galleryCounts([])), "No photos yet. Photos that residents attach to reports appear here.");
  assert.equal(evidenceSummary(galleryCounts(["private"])), "1 photo. None are shown to residents.");
  assert.equal(formatBytes(18_200_000), "18.2 MB");
  assert.equal(formatBytes(640_000), "640 KB");
  assert.equal(formatBytes(0), "0 KB");
});

test("audit entries read as plain actions with the operator's own reason", () => {
  const approve = { action: "v2_demo_hazard_review", detail: "Decision: corroborated; public demo photo approved: true. Matches the photo" };
  assert.equal(auditActionLabel(approve), "Approved");
  assert.equal(auditReason(approve), "Matches the photo");
  assert.equal(auditPhotoPublished(approve), true);
  const reject = { action: "v2_demo_hazard_review", detail: "Decision: rejected; public demo photo approved: false. Duplicate report" };
  assert.equal(auditActionLabel(reject), "Rejected");
  assert.equal(auditPhotoPublished(reject), false);
  assert.equal(auditActionLabel({ action: "v2_demo_incident_created", detail: "Grouped report r1; operator reason: Same junction" }), "Group opened");
  assert.equal(auditReason({ action: "v2_demo_incident_created", detail: "Grouped report r1; operator reason: Same junction" }), "Same junction");
  assert.equal(auditActionLabel({ action: "v2_demo_something_new", detail: "" }), "Something new");
});

test("the CSV export quotes commas and defuses spreadsheet formulas", () => {
  const csv = auditCsv([{ id: "1", action: "v2_demo_hazard_review", subjectId: "r1", actor: "LOCAL_DEMO_OPERATOR", createdAt: "2026-11-21T08:00:00.000Z",
    detail: "Decision: rejected; public demo photo approved: false. =HYPERLINK(\"x\"), duplicate" }]);
  const [header, row] = csv.trim().split("\r\n");
  assert.equal(header, "When,Action,Subject ID,Reason given,By");
  assert.match(row, /,"'=HYPERLINK\(""x""\), duplicate",/);
});

test("Evidence is a photo grid with storage and checks, and private photos are released", () => {
  const page = read("src/components/management/pages/EvidencePage.tsx");
  const gallery = read("src/components/management/EvidenceGallery.tsx");
  assert.match(page, /<EvidenceGallery operatorKey=\{operatorKey\} onSummary=\{setCounts\} \/>/);
  assert.match(page, /<EvidenceSidePanel operatorKey=\{operatorKey\} \/>/);
  assert.match(gallery, /URL\.revokeObjectURL/);
  assert.match(gallery, /"x-demo-operator-key": operatorKey/);
  assert.match(gallery, /href=\{reportLink\(open\.id\)\}/, "each photo opens its exact report");
  assert.match(read("src/components/management/EvidenceSidePanel.tsx"), /\/api\/v2\/evidence-consistency/);
});

test("System & Audit leads with status cards and a readable action table", () => {
  const overview = read("src/components/management/SystemOverview.tsx");
  for (const title of ["Service area", "Data consistency", "Road data", "AI help"]) assert.match(overview, new RegExp(`title="${title}"`));
  assert.match(overview, /Operator actions/);
  assert.match(overview, /auditCsv\(audit\)/);
  assert.match(read("src/components/management/pages/SystemPage.tsx"), /<SystemOverview operatorKey=\{operatorKey\} reloadToken=\{runs\} \/>/);
});

test("the older panels follow the Night Desk type rules", () => {
  for (const file of ["src/components/management/DemoDataQuality.tsx", "src/components/management/GeoSourceManifest.tsx", "src/components/management/RoadTopologyQuality.tsx",
    "src/components/management/RoadAccessTags.tsx", "src/components/audit/AuditPanel.tsx", "src/components/management/ResearchExport.tsx",
    "src/components/management/AiEvaluationWorkbench.tsx", "src/components/management/EvidenceInventory.tsx", "src/components/management/EvidenceConsistency.tsx",
    "src/components/maps/GeographicReferenceWorkspace.tsx", "src/components/management/pages/ResearchPage.tsx"]) {
    const source = read(file);
    assert.doesNotMatch(source, /\buppercase\b|font-bold|font-extrabold|lucide-react|violet-|\btext-(xs|sm|lg|xl|2xl)\b/, file);
  }
});
