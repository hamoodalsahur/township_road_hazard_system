import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Screens rebuilt in the new style (roadmap 4.2) must stay on the DESIGN.md scales.
// From the unslop design audit of 21 November 2026 (docs/design/unslop-audit-2026-11-21.md).
const REBUILT = [
  "src/components/management/V2HazardManager.tsx", "src/components/management/IncidentManager.tsx",
  "src/components/management/pages/OverviewPage.tsx", "src/components/management/pages/IncidentsPage.tsx",
  "src/components/management/ManagementShell.tsx", "src/components/management/ManagementSectionHeading.tsx",
  "src/components/hazards/HazardChips.tsx", "src/components/hazards/ReportMiniMap.tsx",
  "src/components/management/IncidentRoadCandidates.tsx", "src/components/management/ServiceAreaStatus.tsx",
  "src/components/management/ReviewAgeQueue.tsx", "src/components/management/OperatorAuditSummary.tsx",
  // Night Desk foundation (21 November 2026): the shared shadcn/ui components.
  "src/components/ui/button.tsx", "src/components/ui/input.tsx", "src/components/ui/checkbox.tsx",
  "src/components/ui/tabs.tsx", "src/components/ui/dialog.tsx",
  // Night Desk Overview and Incidents (21 November 2026).
  "src/components/hazards/OverviewMap.tsx", "src/components/management/TodayTimeline.tsx",
  // Night Desk Maps stage (22 November 2026).
  "src/components/maps/ManagementMapStage.tsx",
];

test("the type scale is defined once in Tailwind", () => {
  const config = readFileSync("tailwind.config.ts", "utf8");
  for (const [name, size] of [["caption", 13], ["small", 14], ["body", 16], ["heading", 18], ["title", 24], ["display", 32]]) {
    assert.match(config, new RegExp(`${name}: \\["${size}px"`));
  }
});

for (const file of REBUILT) {
  test(`${file} stays on the type, spacing and icon scales`, () => {
    const source = readFileSync(file, "utf8");
    // Text only from the named scale: no Tailwind default sizes and no one-off pixel sizes.
    assert.doesNotMatch(source, /(?<![\w-])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/);
    assert.doesNotMatch(source, /text-\[\d+px\]/);
    // Spacing on the 4 px base. Half steps are allowed only for tiny nudges (0.5) and the centred lifecycle line.
    const halfSteps = (source.match(/(?<![\w-])-?(p|px|py|pt|pb|pl|pr|m|mt|mb|ml|mr|gap|gap-x|gap-y|space-y|space-x)-(1|2|3)\.5(?![\w-])/g) ?? []);
    assert.deepEqual(halfSteps, [], `${file} uses half steps: ${halfSteps.join(", ")}`);
    // Interface icons in 14, 16, 20 or 24 px (markers have their own sizes and are not Phosphor size props).
    for (const size of source.match(/Icon size=\{\d+\}/g) ?? []) {
      assert.ok(/size=\{(11|14|16|20|24)\}/.test(size), `${file}: ${size}`);
    }
  });
}

test("chips are calmer than titles, the avatar is neutral, and inputs use the control radius", () => {
  assert.match(readFileSync("src/components/hazards/HazardChips.tsx", "utf8"), /text-caption font-medium/);
  assert.doesNotMatch(readFileSync("src/components/management/ManagementShell.tsx", "utf8"), /bg-teal-100[^"]*>OP</);
  // The review screen now uses the shared Input (10 px radius, field border); groups still style their own.
  assert.match(readFileSync("src/components/management/V2HazardManager.tsx", "utf8"), /<Input id=\{"reason-"/);
  assert.match(readFileSync("src/components/ui/input.tsx", "utf8"), /h-11 w-full rounded-lg border border-slate-400/);
  assert.match(readFileSync("src/components/management/IncidentManager.tsx", "utf8"), /min-h-11 w-full rounded-lg border border-slate-400/);
});
