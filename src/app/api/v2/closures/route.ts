import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canUseDemoOperatorApi } from "@/lib/demo-access";
import { loadServiceArea } from "@/lib/service-area-server";
import { closureSourceProblem, roadNames, validateClosureCreate, CLOSURE_KIND_LABELS } from "@/lib/road-closures";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store" };
const WEEK = 7 * 86_400_000;

/** Operators: closures in the active area that are upcoming, active, past their end time, or ended in the last 7 days. */
export async function GET(request: Request) {
  if (!canUseDemoOperatorApi(request)) return NextResponse.json({ error: "Development operator access required" }, { status: 403 });
  try {
    const areaId = loadServiceArea().area.id;
    const closures = await prisma.roadClosure.findMany({
      where: { areaId, sourceMode: "simulation", OR: [{ endedAt: null }, { endedAt: { gte: new Date(Date.now() - WEEK) } }] },
      orderBy: { endsAt: "asc" }, include: { roads: { select: { wayId: true, name: true, coordinates: true } } },
    });
    const history = await prisma.auditEntry.findMany({ where: { subjectId: { in: closures.map(c => c.id) } }, orderBy: { createdAt: "desc" },
      select: { subjectId: true, action: true, detail: true, createdAt: true } });
    const reportIds = closures.flatMap(c => (c.reportId ? [c.reportId] : []));
    const incidentIds = closures.flatMap(c => (c.incidentId ? [c.incidentId] : []));
    const [reports, incidents] = await Promise.all([
      prisma.hazardReport.findMany({ where: { id: { in: reportIds } }, select: { id: true, category: true, description: true } }),
      prisma.demoIncident.findMany({ where: { id: { in: incidentIds } }, select: { id: true, title: true } }),
    ]);
    return NextResponse.json({
      closures: closures.map(c => ({
        ...c, title: roadNames(c.roads.map(r => r.name)),
        source: c.reportId ? { kind: "report", id: c.reportId, label: reports.find(r => r.id === c.reportId)?.description ?? "Report" }
          : { kind: "incident", id: c.incidentId, label: incidents.find(i => i.id === c.incidentId)?.title ?? "Incident group" },
        history: history.filter(h => h.subjectId === c.id),
      })),
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Road closures are unavailable. Run npm run db:migrate." }, { status: 500, headers: NO_STORE });
  }
}

/** Operators: close roads from an approved report or an open incident group. */
export async function POST(request: Request) {
  if (!canUseDemoOperatorApi(request)) return NextResponse.json({ error: "Development operator access required" }, { status: 403 });
  let data;
  try { data = validateClosureCreate(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid closure" }, { status: 400 }); }
  try {
    const areaId = loadServiceArea().area.id;
    const outcome = await prisma.$transaction(async tx => {
      let category: string;
      if (data.source.kind === "report") {
        const report = await tx.hazardReport.findUnique({ where: { id: data.source.id }, select: { reviewState: true, sourceMode: true, category: true } });
        if (!report || report.sourceMode !== "simulation") return { status: 404, error: "Report not found" };
        const problem = closureSourceProblem({ kind: "report", reviewState: report.reviewState });
        if (problem) return { status: 409, error: problem };
        category = report.category;
      } else {
        const incident = await tx.demoIncident.findUnique({ where: { id: data.source.id }, select: { status: true, sourceMode: true, category: true, reports: { select: { report: { select: { reviewState: true } } } } } });
        if (!incident || incident.sourceMode !== "simulation") return { status: 404, error: "Incident group not found" };
        const problem = closureSourceProblem({ kind: "incident", status: incident.status, reviewStates: incident.reports.map(r => r.report.reviewState) });
        if (problem) return { status: 409, error: problem };
        category = incident.category;
      }
      // Roads must be in the database for the active area (npm run db:import-roads); a copy of each line is kept with the closure.
      const lines = await tx.roadLine.findMany({ where: { areaId, wayId: { in: data.wayIds } }, select: { wayId: true, name: true, coordinates: true } });
      if (lines.length !== data.wayIds.length) return { status: 409, error: "Some roads are not in the database for this area. Run npm run db:import-roads, then try again." };
      // A road can be in only one open closure at a time: change that closure instead of stacking another on top.
      const open = await tx.roadClosureRoad.findFirst({ where: { areaId, wayId: { in: data.wayIds }, closure: { endedAt: null, endsAt: { gt: new Date() } } }, select: { name: true } });
      if (open) return { status: 409, error: `${open.name} is already in an open closure. Extend or end that one in Road closures instead.` };
      const closure = await tx.roadClosure.create({ data: {
        areaId, kind: data.kind, reason: data.reason, startsAt: data.startsAt, endsAt: data.endsAt, category,
        reportId: data.source.kind === "report" ? data.source.id : null, incidentId: data.source.kind === "incident" ? data.source.id : null,
        roads: { create: lines.map(line => ({ areaId, wayId: line.wayId, name: line.name, coordinates: line.coordinates ?? [] })) },
      } });
      await tx.auditEntry.create({ data: { action: "v2_road_closure_created", subjectId: closure.id, actor: "LOCAL_DEMO_OPERATOR", sourceMode: "simulation",
        detail: `${CLOSURE_KIND_LABELS[data.kind]}: ${roadNames(lines.map(l => l.name))} (${lines.length} road${lines.length === 1 ? "" : "s"}) from ${data.source.kind} ${data.source.id}, ${data.startsAt.toISOString()} to ${data.endsAt.toISOString()}; reason: ${data.reason}` } });
      return { status: 201, closure };
    });
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ closure: outcome.closure, disclaimer: "Fictional demo closure. Not a real road closure or travel advice." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the closure" }, { status: 500 });
  }
}
