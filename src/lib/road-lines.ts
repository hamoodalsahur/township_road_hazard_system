/**
 * Road lines in the database (roadmap step 2.3). Pure helpers shared by the import script,
 * the server loader (road-lines-server.ts) and the tests. No Node or Prisma imports.
 *
 * A row keeps the feature's full properties and coordinates, so turning rows back into a
 * FeatureCollection gives the same lines, in the same order, as the GeoJSON file they came from.
 */
import { MAX_ROAD_LINES, validRoadCollection, type RoadCollection, type RoadFeature } from "./bbr-roads";

export type RoadLineRow = {
  areaId: string;
  wayId: string;
  position: number;
  name: string;
  highway: string;
  coordinates: [number, number][];
  properties: RoadFeature["properties"];
  west: number;
  south: number;
  east: number;
  north: number;
  importId: string;
};

/** Where the roads on screen came from: the database, the area's file (before the first import), or nowhere. */
export type RoadSource = "database" | "file" | "none";

/** Browser address of the active area's road lines (src/app/api/v2/road-lines/route.ts). */
export const ROAD_LINES_API = "/api/v2/road-lines";

export function lineBounds(coordinates: readonly (readonly [number, number])[]) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [lon, lat] of coordinates) {
    west = Math.min(west, lon); east = Math.max(east, lon);
    south = Math.min(south, lat); north = Math.max(north, lat);
  }
  return { west, south, east, north };
}

/** One row per feature, numbered in file order. Throws on a repeated way id, which the table's key would refuse. */
export function roadLineRows(areaId: string, features: readonly RoadFeature[], importId: string): RoadLineRow[] {
  const seen = new Set<string>();
  return features.map((feature, position) => {
    const wayId = feature.properties.id;
    if (seen.has(wayId)) throw new Error(`the file lists ${wayId} twice`);
    seen.add(wayId);
    return {
      areaId, wayId, position,
      name: feature.properties.name,
      highway: feature.properties.highway,
      coordinates: feature.geometry.coordinates.map(([lon, lat]) => [lon, lat] as [number, number]),
      properties: { ...feature.properties },
      ...lineBounds(feature.geometry.coordinates),
      importId,
    };
  });
}

type StoredRow = { position: number; coordinates: unknown; properties: unknown };

/** Rows back to a FeatureCollection, ordered by position. Returns null if anything stored is not a valid road line. */
export function collectionFromRows(rows: readonly StoredRow[]): RoadCollection | null {
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  const collection = {
    type: "FeatureCollection" as const,
    features: ordered.map(row => ({ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: row.coordinates }, properties: row.properties })),
  };
  return validRoadCollection(collection) ? collection : null;
}

/** Plain-English reason the import should not run, or null. `parsed` is the file's JSON. */
export function roadImportProblem(fileLabel: string, parsed: unknown, areaId: string): string | null {
  if (!validRoadCollection(parsed)) return `${fileLabel} is not a valid road file (it must be the GeoJSON made by the road import, up to ${MAX_ROAD_LINES.toLocaleString("en-GB")} lines).`;
  if (parsed.features.length === 0) {
    return areaId === "bbr"
      ? `${fileLabel} has no road lines. The copy on GitHub is an empty placeholder; BBR's real lines exist only on the PC that imported them.`
      : `${fileLabel} has no road lines. Download your area's roads first (npm run geo:import-area).`;
  }
  return null;
}
