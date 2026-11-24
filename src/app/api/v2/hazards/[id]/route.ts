import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canUseDemoOperatorApi } from "@/lib/demo-access";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/v2/hazards/:id (operators only, 24 Nov 2026): removes a report from the database for good,
 * with its photo (cascade), its link to an incident group, its road closures and its resolution.
 * The audit history keeps one line saying it was deleted (category only, never the description).
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!canUseDemoOperatorApi(request)) return NextResponse.json({ error: "Local demo operator access required." }, { status: 403 });
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async tx => {
      const report = await tx.hazardReport.findUnique({ where: { id }, select: { category: true, sourceMode: true } });
      if (!report) return null;
      const closures = await tx.roadClosure.deleteMany({ where: { reportId: id } }); // closure roads cascade
      await tx.incidentReportLink.deleteMany({ where: { reportId: id } });
      await tx.reportResolution.deleteMany({ where: { reportId: id } });
      await tx.hazardReport.delete({ where: { id } }); // the photo cascades
      await tx.auditEntry.create({ data: { action: "v2_report_deleted", subjectId: id, actor: "LOCAL_DEMO_OPERATOR", sourceMode: report.sourceMode,
        detail: `Report deleted (${report.category}); ${closures.count} road closure(s) removed with it.` } });
      return { closuresRemoved: closures.count };
    });
    if (!result) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ deleted: true, ...result });
  } catch {
    return NextResponse.json({ error: "Could not delete the report." }, { status: 500 });
  }
}
