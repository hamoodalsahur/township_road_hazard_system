"use client";
import { validRoadCollection, type RoadFeature } from "./bbr-roads";
import { roadsUrlFor } from "./service-area";

// Each area's road file is loaded once per visit and shared by every map drawing.
// BBR's file is the owner's local copy (an empty stub on GitHub); other areas use public/data/roads/<id>.geojson.
const cache = new Map<string, Promise<RoadFeature[]>>();
export function loadRoads(areaId: string): Promise<RoadFeature[]> {
  let roads = cache.get(areaId);
  if (!roads) {
    roads = fetch(roadsUrlFor(areaId), { cache: "no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then((data: unknown) => (validRoadCollection(data) ? data.features : []))
      .catch(() => []);
    cache.set(areaId, roads);
  }
  return roads;
}
