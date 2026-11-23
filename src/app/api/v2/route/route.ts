import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadServiceArea } from "@/lib/service-area-server";
import { publicClosure } from "@/lib/road-closures";
import { RoutingUnavailable, checkWayHome, makeRateLimiter, validateRouteRequest, type ActiveClosureLines } from "@/lib/routing";
import { routingConfig } from "@/lib/routing-server";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const allow = makeRateLimiter(10, 60_000);

/**
 * Way home (roadmap 6.2): POST { from: [lon, lat], to: [lon, lat] }.
 * Returns the usual route, whether an active closure is on it, and a detour around closures.
 * The points are sent to the routing provider for this answer only. They are never stored or logged here.
 */
export async function POST(request: Request) {
  const { provider, reason } = routingConfig();
  if (!provider) return NextResponse.json({ status: "unavailable", error: reason }, { status: 503, headers: NO_STORE });
  const who = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(who)) return NextResponse.json({ status: "unavailable", error: "Too many checks in a minute. Wait a moment and try again." }, { status: 429, headers: NO_STORE });
  let trip;
  try { trip = validateRouteRequest(await request.json().catch(() => null)); }
  catch (error) { return NextResponse.json({ status: "invalid", error: error instanceof Error ? error.message : "Invalid route request" }, { status: 400, headers: NO_STORE }); }
  try {
    const now = new Date();
    const rows = await prisma.roadClosure.findMany({
      where: { areaId: loadServiceArea().area.id, sourceMode: "simulation", endedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      select: { id: true, kind: true, endsAt: true, category: true, roads: { select: { wayId: true, name: true, coordinates: true } } },
    }).catch(() => []);
    const closures: ActiveClosureLines[] = rows.map(publicClosure).map(c => ({ id: c.id, title: c.title, kindLabel: c.kindLabel, endsAt: c.endsAt, lines: c.roads.map(r => r.coordinates) }));
    const answer = await checkWayHome(provider, trip.from, trip.to, closures, now);
    return NextResponse.json(answer, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof RoutingUnavailable ? error.message : "The way-home check failed. Try again.";
    return NextResponse.json({ status: "unavailable", error: message }, { status: 503, headers: NO_STORE });
  }
}
