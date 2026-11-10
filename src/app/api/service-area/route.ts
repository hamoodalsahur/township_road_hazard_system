import { NextResponse } from "next/server";
import { loadServiceArea } from "@/lib/service-area-server";
import { serviceAreaResponse } from "@/lib/service-area";

export const dynamic = "force-dynamic";

/** The active service area, so browser checks and maps use the same area as the server. */
export async function GET() {
  const { area, configuredId, fallbackReason } = loadServiceArea();
  return NextResponse.json(serviceAreaResponse(area, configuredId, fallbackReason), { headers: { "Cache-Control": "no-store" } });
}
