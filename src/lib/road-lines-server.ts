// Server only: reads the database, and the area's road file as a fallback.
import { readFile } from "node:fs/promises";
import { prisma } from "./db";
import { validRoadCollection, type RoadCollection } from "./bbr-roads";
import { collectionFromRows, type RoadSource } from "./road-lines";
import { activeRoadsPath, loadServiceArea } from "./service-area-server";

export type ActiveRoads = { areaId: string; source: RoadSource; collection: RoadCollection | null };

/**
 * Road lines for the active service area (roadmap step 2.3).
 * 1. The road_lines table, once `npm run db:import-roads` has copied the area's file in.
 * 2. Otherwise the area's GeoJSON file, as before step 2.3 (so nothing breaks before the first import).
 * The file is only read, never written.
 */
export async function loadActiveRoads(): Promise<ActiveRoads> {
  const areaId = loadServiceArea().area.id;
  try {
    const rows = await prisma.roadLine.findMany({ where: { areaId }, orderBy: { position: "asc" }, select: { position: true, coordinates: true, properties: true } });
    if (rows.length > 0) {
      const collection = collectionFromRows(rows);
      if (collection) return { areaId, source: "database", collection };
    }
  } catch {
    // Database not reachable or not migrated yet: use the file.
  }
  try {
    const parsed: unknown = JSON.parse(await readFile(activeRoadsPath(), "utf8"));
    if (validRoadCollection(parsed)) return { areaId, source: "file", collection: parsed };
  } catch {
    // No file either.
  }
  return { areaId, source: "none", collection: null };
}
