import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canUseDemoOperatorApi } from "@/lib/demo-access";
import { resolveProblem, validateResolveNote } from "@/lib/report-resolution";

export const dynamic = "force-dynamic";

/**
 * POST /api/v2/hazards/:id/resolve, body { note }. Operators only.
 * Marks an approved report resolved and ends every open road closure made from it, in one transaction,
 * with audit entries for both.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!canUseDemoOperatorApi(request)) return NextResponse.json({ error: "Local demo operator access required." }, { status: 403 });
  let note: string;
  try { ({ note } = validateResolveNote(await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error && !(error instanceof SyntaxError) ? error.message : "Send a JSON body with a note" }, { status: 400 }); }
  try {
    const { id } = await context.params;
    const now = new Date();
    const result = await prisma.$transaction(async tx => {
      const report = await tx.hazardReport.findUnique({ where: { id }, select: { sourceMode: true, reviewState: true } });
      const already = await tx.reportResolution.findUnique({ where: { reportId: id }, select: { reportId: true } });
      const problem = resolveProblem(report, !!already);
      if (problem) return problem;
      await tx.reportResolution.create({ data: { reportId: id, resolvedAt: now, note } });
      const open = await tx.roadClosure.findMany({ where: { reportId: id, endedAt: null, endsAt: { gt: now } }, select: { id: true } });
      for (const closure of open) {
        await tx.roadClosure.update({ where: { id: closure.id }, data: { endedAt: now, endReason: note } });
        await tx.auditEntry.create({ data: { action: "v2_road_closure_ended", subjectId: closure.id, actor: "LOCAL_DEMO_OPERATOR", sourceMode: "simulation", detail: `Ended because report ${id} was marked cleared: ${note}` } });
      }
      await tx.auditEntry.create({ data: { action: "v2_report_resolved", subjectId: id, actor: "LOCAL_DEMO_OPERATOR", sourceMode: "simulation", detail: `Road cleared; ${open.length} closure(s) ended. ${note}` } });
      return { resolvedAt: now.toISOString(), closuresEnded: open.length };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not mark the report cleared." }, { status: 500 });
  }
}
