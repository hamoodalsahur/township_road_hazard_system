/**
 * Get the app ready to present (presentation polish, 23 Nov 2026).
 *
 *   npm run demo:prepare                 show the plan; changes nothing
 *   npm run demo:prepare -- --apply      do it
 *   npm run demo:prepare -- --restore    bring archived reports back (undo step 1)
 *
 * 1. Archives reports outside the active service area (for example the old BBR ones) by setting their
 *    sourceMode to "archived_other_area". Nothing is deleted; every screen simply stops listing them.
 *    Incident groups whose reports are all archived are archived the same way.
 * 2. Adds a small fictional set in the active area, placed on its road lines: two approved reports
 *    (one with a 6-hour road closure and one in an incident group), three waiting, one rejected.
 *
 * Runs in one transaction, writes audit entries like the app does, and saves the new ids to backup/.
 * Coordinates are worked out from your own road lines on your PC; none are written to Git.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { targetProblem } from "../src/lib/db-copy";
import { isInsideServiceArea } from "../src/lib/service-area";
import { loadServiceAreaFrom, SERVICE_AREA_DIR } from "../src/lib/service-area-server";
import { lineMiddle } from "../src/lib/road-closures";

const ARCHIVED = "archived_other_area";
const ACTOR = "LOCAL_DEMO_OPERATOR";
type Seed = { category: string; impact: string; description: string; minutesAgo: number; decision?: "corroborated" | "rejected"; note?: string; closure?: boolean; group?: string };
const SEEDS: Seed[] = [
  { category: "road_obstruction", impact: "suspected_closure", description: "Contractor barrier across the road, both lanes blocked", minutesAgo: 95, decision: "corroborated", note: "Barrier confirmed by a second resident report", closure: true },
  { category: "flooding", impact: "partial_obstruction", description: "Water pooling across both lanes after the afternoon rain, about ankle deep", minutesAgo: 70, decision: "corroborated", note: "Matches the rain this afternoon and the photo", group: "Afternoon flooding near the junction" },
  { category: "roadworks", impact: "partial_obstruction", description: "Roadworks narrowing the road to one lane during the day", minutesAgo: 12 },
  { category: "fallen_tree", impact: "caution", description: "Large branch on the roadside, one lane still passable", minutesAgo: 35 },
  { category: "pothole", impact: "caution", description: "Deep pothole near the bus stop, hard to see at night", minutesAgo: 150 },
  { category: "storm_damage", impact: "unknown", description: "Signboard blown onto the pavement, not sure if it blocks the road", minutesAgo: 210, decision: "rejected", note: "On the pavement, not on the road" },
];

async function main() {
  try { process.loadEnvFile(".env"); } catch { /* rely on the environment */ }
  const args = process.argv.slice(2);
  const apply = args.includes("--apply"), restore = args.includes("--restore");
  const problem = targetProblem(process.env.DATABASE_URL);
  if (problem) throw Error(problem);
  const loaded = loadServiceAreaFrom(SERVICE_AREA_DIR, process.env.SERVICE_AREA);
  if (loaded.fallbackReason) throw Error(`The active area could not be loaded: ${loaded.fallbackReason}`);
  const area = loaded.area;
  const db = new PrismaClient();
  try {
    if (restore) {
      const [r, i] = await db.$transaction([
        db.hazardReport.updateMany({ where: { sourceMode: ARCHIVED }, data: { sourceMode: "simulation" } }),
        db.demoIncident.updateMany({ where: { sourceMode: ARCHIVED }, data: { sourceMode: "simulation" } }),
      ]);
      console.log(`Restored ${r.count} archived reports and ${i.count} archived groups.`);
      return;
    }

    // 1. Reports outside the area.
    const reports = await db.hazardReport.findMany({ where: { sourceMode: "simulation" }, select: { id: true, longitude: true, latitude: true } });
    const outside = reports.filter(r => !isInsideServiceArea(area, r.longitude, r.latitude)).map(r => r.id);
    const groups = await db.demoIncident.findMany({ where: { sourceMode: "simulation" }, select: { id: true, reports: { select: { reportId: true } } } });
    const outsideSet = new Set(outside);
    const groupsOut = groups.filter(g => g.reports.length > 0 && g.reports.every(l => outsideSet.has(l.reportId))).map(g => g.id);
    console.log(`Active area: ${area.name}`);
    console.log(`1. Archive ${outside.length} reports outside the area and ${groupsOut.length} groups made only of them (nothing is deleted).`);

    // 2. Places on named road lines inside the area, spread out.
    const lines = await db.roadLine.findMany({ where: { areaId: area.id }, select: { wayId: true, name: true, coordinates: true }, orderBy: { position: "asc" } });
    const usable = lines.flatMap(l => {
      const middle = lineMiddle(l.coordinates as [number, number][]);
      return middle && !/^unnamed/i.test(l.name) && isInsideServiceArea(area, middle[0], middle[1]) ? [{ ...l, middle }] : [];
    }).sort((a, b) => a.middle[0] - b.middle[0] || a.middle[1] - b.middle[1]);
    // Only one demo set: running the script again never adds a second one.
    const already = await db.demoIncident.count({ where: { sourceMode: "simulation", reviewNote: "Grouped for follow-up (demo set)" } });
    const picks = already === 0 && usable.length >= SEEDS.length ? SEEDS.map((_, i) => usable[Math.floor((i + 0.5) * usable.length / SEEDS.length)]) : [];
    if (already) console.log("2. Skipped: the demo set is already there.");
    else if (!picks.length) console.log("2. Skipped: no named road lines in the database for this area. Run npm run db:import-roads first.");
    else console.log(`2. Add ${SEEDS.length} fictional reports on ${picks.map(p => p.name).join(", ")}; 1 group; 1 road closure for 6 hours.`);

    if (!apply) { console.log("\nNothing was changed. Run again with -- --apply to do it."); return; }

    const created: { reports: string[]; incident: string | null; closure: string | null } = { reports: [], incident: null, closure: null };
    await db.$transaction(async tx => {
      if (outside.length) await tx.hazardReport.updateMany({ where: { id: { in: outside } }, data: { sourceMode: ARCHIVED } });
      if (groupsOut.length) await tx.demoIncident.updateMany({ where: { id: { in: groupsOut } }, data: { sourceMode: ARCHIVED } });
      if (outside.length) await tx.auditEntry.create({ data: { action: "v2_demo_reports_archived", subjectId: area.id, actor: ACTOR, sourceMode: "simulation",
        detail: `Archived ${outside.length} reports outside ${area.name} and ${groupsOut.length} groups (npm run demo:prepare). Undo: npm run demo:prepare -- --restore` } });
      const now = Date.now();
      for (const [i, seed] of SEEDS.entries()) {
        const place = picks[i];
        if (!place) break;
        const createdAt = new Date(now - seed.minutesAgo * 60_000);
        const reviewedAt = seed.decision ? new Date(createdAt.getTime() + 20 * 60_000) : null;
        const report = await tx.hazardReport.create({ data: { category: seed.category, impact: seed.impact, description: seed.description,
          longitude: place.middle[0], latitude: place.middle[1], createdAt, reviewState: seed.decision ?? "unverified", reviewNote: seed.note ?? null, reviewedAt } });
        created.reports.push(report.id);
        if (seed.decision) await tx.auditEntry.create({ data: { action: "v2_demo_hazard_review", subjectId: report.id, actor: ACTOR, sourceMode: "simulation", createdAt: reviewedAt!,
          detail: `Decision: ${seed.decision}; public demo photo approved: false. ${seed.note}` } });
        if (seed.group) {
          const incident = await tx.demoIncident.create({ data: { title: seed.group, category: seed.category, reviewNote: "Grouped for follow-up (demo set)", reports: { create: { reportId: report.id } } } });
          created.incident = incident.id;
          await tx.auditEntry.create({ data: { action: "v2_demo_incident_created", subjectId: incident.id, actor: ACTOR, sourceMode: "simulation", detail: `Grouped report ${report.id}; operator reason: Grouped for follow-up (demo set)` } });
        }
        if (seed.closure) {
          const busy = await tx.roadClosureRoad.findFirst({ where: { areaId: area.id, wayId: place.wayId, closure: { endedAt: null, endsAt: { gt: new Date() } } } });
          if (busy) continue;
          const closure = await tx.roadClosure.create({ data: { areaId: area.id, kind: "closed", reason: "Contractor barrier confirmed (demo set)", startsAt: new Date(now),
            endsAt: new Date(now + 6 * 3_600_000), reportId: report.id, category: seed.category,
            roads: { create: [{ areaId: area.id, wayId: place.wayId, name: place.name, coordinates: place.coordinates ?? [] }] } } });
          created.closure = closure.id;
          await tx.auditEntry.create({ data: { action: "v2_road_closure_created", subjectId: closure.id, actor: ACTOR, sourceMode: "simulation",
            detail: `Closed to cars: ${place.name} (1 road) from report ${report.id}; reason: Contractor barrier confirmed (demo set)` } });
        }
      }
    }, { timeout: 60_000 });

    await mkdir(path.resolve("backup"), { recursive: true });
    const file = path.resolve("backup", `demo-seed-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.json`);
    await writeFile(file, JSON.stringify({ archivedReports: outside, archivedGroups: groupsOut, created }, null, 2));
    console.log(`\nDone. Archived ${outside.length} reports; added ${created.reports.length} reports${created.closure ? ", 1 closure" : ""}${created.incident ? ", 1 group" : ""}.`);
    console.log(`Ids saved in ${path.relative(process.cwd(), file)} (gitignored). Reload the app.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error("\nStopped: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
