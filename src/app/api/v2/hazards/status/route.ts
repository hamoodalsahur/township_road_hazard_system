import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStatusIds, type PublicReportStatus } from "@/lib/resident-reports";

export const dynamic = "force-dynamic";

/**
 * Status of reports a resident sent from this browser ("My reports", roadmap step 4.3).
 * GET /api/v2/hazards/status?ids=a,b,c (up to 50 ids). Public fields only: review state, the linked
 * incident's status and when either last changed. Never the operator's note, the description or a photo.
 * Unknown ids are simply missing from the answer.
 */
export async function GET(request: Request) {
  const ids = parseStatusIds(new URL(request.url).searchParams.get("ids"));
  if (!ids) return NextResponse.json({ error: "Give up to 50 report ids, separated by commas" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const records = await prisma.hazardReport.findMany({
      where: { id: { in: ids }, sourceMode: "simulation" },
      select: { id: true, reviewState: true, reviewedAt: true, createdAt: true, incidentLink: { select: { incident: { select: { status: true, updatedAt: true } } } } },
    });
    const resolutions = new Map((await prisma.reportResolution.findMany({ where: { reportId: { in: records.map(r => r.id) } }, select: { reportId: true, resolvedAt: true } })).map(r => [r.reportId, r.resolvedAt]));
    const reports: PublicReportStatus[] = records.map(record => {
      const incident = record.incidentLink?.incident ?? null;
      const resolvedAt = resolutions.get(record.id); // a cleared report reads as resolved
      const times = [record.createdAt, record.reviewedAt, incident?.updatedAt, resolvedAt].filter((t): t is Date => t instanceof Date).map(t => t.getTime());
      return { id: record.id, reviewState: record.reviewState, incidentStatus: resolvedAt ? "resolved" : incident?.status ?? null, updatedAt: new Date(Math.max(...times)).toISOString() };
    });
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Report status is unavailable right now" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
