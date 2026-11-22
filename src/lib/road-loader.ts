"use client";
import { validRoadCollection, type RoadFeature } from "./bbr-roads";
import { ROAD_LINES_API } from "./road-lines";

// Each area's road lines are loaded once per visit and shared by every map drawing.
// They come from the database after `npm run db:import-roads`, or from the area's file before that (step 2.3).
const cache = new Map<string, Promise<RoadFeature[]>>();
export function loadRoads(areaId: string): Promise<RoadFeature[]> {
  let roads = cache.get(areaId);
  if (!roads) {
    roads = fetch(ROAD_LINES_API, { cache: "no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then((data: unknown) => (validRoadCollection(data) && (data as { areaId?: unknown }).areaId === areaId ? data.features : []))
      .catch(() => []);
    cache.set(areaId, roads);
  }
  return roads;
}
