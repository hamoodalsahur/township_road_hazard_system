import { NextResponse } from "next/server";
import { loadActiveRoads } from "@/lib/road-lines-server";

export const dynamic = "force-dynamic";

/**
 * Road lines for the active service area, as GeoJSON (roadmap step 2.3).
 * From the database after `npm run db:import-roads`; from the area's file before that.
 * Unverified OpenStreetMap reference, the same lines the public file already held.
 */
export async function GET() {
  const roads = await loadActiveRoads();
  if (!roads.collection) {
    return NextResponse.json({ type: "FeatureCollection", features: [], areaId: roads.areaId, source: roads.source }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ...roads.collection, areaId: roads.areaId, source: roads.source }, { headers: { "Cache-Control": "no-store" } });
}
