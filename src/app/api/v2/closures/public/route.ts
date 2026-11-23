import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadServiceArea } from "@/lib/service-area-server";
import { publicClosure } from "@/lib/road-closures";

export const dynamic = "force-dynamic";

/**
 * Road closures active right now in the active area, for residents and the maps (roadmap 5.1).
 * Public fields only: roads, how closed, end time and report type. Never the operator's reason.
 */
export async function GET() {
  try {
    const now = new Date();
    const rows = await prisma.roadClosure.findMany({
      where: { areaId: loadServiceArea().area.id, sourceMode: "simulation", endedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { endsAt: "asc" },
      select: { id: true, kind: true, endsAt: true, category: true, roads: { select: { wayId: true, name: true, coordinates: true } } },
    });
    return NextResponse.json({ closures: rows.map(publicClosure), disclaimer: "Fictional demo closures. Not real road conditions or travel advice." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ closures: [], error: "Road closures are unavailable right now" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
