import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCompactSource } from "./source-helpers";

// Incidents review, Night Desk (roadmap 4.2b), with the adopted points from the UI/UX handoff.
const review = readCompactSource("src/components/management/V2HazardManager.tsx");
const plain = readFileSync("src/components/management/V2HazardManager.tsx", "utf8");
const page = readCompactSource("src/components/management/pages/IncidentsPage.tsx");
const chips = readFileSync("src/components/hazards/HazardChips.tsx", "utf8");

test("tabs and the summary sit in the navy page header", () => {
  assert.match(page, /<ManagementSectionHeading section="incidents" subtitle=\{subtitle\}tabs=\{/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /onSummaryChange=\{setReviewSummary\}/);
  assert.match(page, /shadow-\[inset_0_-3px_0_#7FD4AE\]/);
});

test("the list says how it is sorted and offers a way out of empty filters", () => {
  assert.match(plain, /Sorted by/);
  assert.match(plain, /needs review first/);
  assert.match(plain, /No matching reports for these filters/);
  assert.match(review, /aria-label="Clear search"/);
  assert.match(review, /onClick=\{clearFilters\}/);
});

test("selection, hover and keyboard focus look different", () => {
  assert.match(plain, /border-\[#B9DCCB\] bg-\[#EAF6F0\] shadow-\[inset_4px_0_0_#0B7350\]/, "selected: green tint and left bar");
  assert.match(plain, /focus-visible:outline-\[#1F5A94\]/, "focus: a blue ring, not the selection colour");
  assert.match(plain, /hover:border-slate-300/);
});

test("road condition and review status are separate chips, and review is never green", () => {
  assert.match(review, /<SeverityChip impact=\{item\.impact\}\/>\{item\.resolvedAt\?<ResolvedChip\/>:<ReviewStateChip reviewState=\{item\.reviewState\}\/>\}/);
  const reviewChip = chips.slice(chips.indexOf("export function ReviewStateChip"), chips.indexOf("export function StatusChip"));
  assert.match(reviewChip, /#E8F0FB/);
  assert.doesNotMatch(reviewChip, /teal-|#0B7350/);
});

test("the detail reads: what, evidence, progress, then the decision", () => {
  const order = ["evidence-heading", "progress-heading", "support-heading", "Reason for your decision"].map(key => plain.indexOf(key));
  assert.ok(order.every(i => i > 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("no photo is a deliberate note and the map takes the space", () => {
  assert.match(review, /selectedPhotoMode==="none"\?<>/);
  assert.match(plain, /No photo for this report/);
  assert.match(plain, /Decide from the description and the location/);
  assert.match(plain, /\{large \? "Smaller" : "Enlarge"\}/);
  assert.match(plain, /Operators only/);
});

test("the reason is labelled as required and the photo choice is its own section", () => {
  assert.match(review, /htmlFor=\{"reason-"\+selectedReport\.id\}/);
  assert.match(plain, /Required, at least \{MIN_REASON_LENGTH\} characters\. Kept in the audit log\./);
  assert.match(plain, /Public visibility/);
  assert.match(review, /checked=\{publishPhotos\[selectedReport\.id\]===true\}/, "unticked unless the operator ticks it");
  assert.match(review, /photoStates\?\.\[selectedReport\.id\]==="private_unreviewed"\?<div/);
});

test("decisions show progress and block double submits", () => {
  assert.match(review, /disabled=\{busy\|\|!reasonIsValid\(notes\[selectedReport\.id\]\)\}/);
  assert.match(review, /\{busy\?"Saving…":"Approve report"\}/);
  assert.match(review, /\{busy\?"Saving…":"Reject report"\}/);
});

test("keyboard shortcuts still work, with their help behind a ? button", () => {
  assert.match(review, /function ShortcutHelp\(\)/);
  assert.match(review, /aria-label="Keyboard shortcuts">\?</);
  assert.doesNotMatch(plain, /<Kbd>J<\/Kbd>\/<Kbd>K<\/Kbd> move/, "the always-visible legend is gone");
  assert.match(review, /reviewShortcut\(/);
});
