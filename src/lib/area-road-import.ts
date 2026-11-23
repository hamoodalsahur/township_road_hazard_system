/**
 * Road lines for your own service area (roadmap 2.1, follow-up): pure rules for
 * scripts/import-area-roads.ts, so they can be tested without the network.
 */
import { areaBounds, isInsideServiceArea, type ServiceArea } from "./service-area";
import type { RoadFeature } from "./bbr-roads";

/** Road types worth drawing for drivers. Footpaths, cycleways, steps and planned roads are left out. */
export const EXCLUDED_HIGHWAYS = "footway|path|steps|cycleway|pedestrian|construction|proposed|bridleway|corridor|elevator|platform";

/** How far outside the area to fetch, in degrees (about 200 m), so roads at the edge are not cut short. */
export const AREA_MARGIN = 0.002;

/** Overpass query for every road in the area's bounding box plus the margin. */
export function overpassQueryFor(area: ServiceArea, margin = AREA_MARGIN): string {
  const b = areaBounds(area);
  const box = [b.south - margin, b.west - margin, b.north + margin, b.east + margin].map(n => n.toFixed(6)).join(",");
  return `[out:json][timeout:120];way["highway"]["highway"!~"${EXCLUDED_HIGHWAYS}"](${box});out geom;`;
}

/** Keep roads that touch the area: at least one point inside, or within the bounding box margin. */
export function roadsTouchingArea(roads: readonly RoadFeature[], area: ServiceArea): RoadFeature[] {
  return roads.filter(road => road.geometry.coordinates.some(([lon, lat]) => isInsideServiceArea(area, lon, lat)));
}

/** Why the import must not run for this area, or null. BBR's file is protected and has its own importer. */
export function importAreaProblem(areaId: string, fallbackReason: string | null): string | null {
  if (fallbackReason) return `The area could not be loaded, so nothing was downloaded: ${fallbackReason}`;
  if (areaId === "bbr") return "The BBR road file is protected. This command is only for your own area (SERVICE_AREA=local or another name).";
  return null;
}
