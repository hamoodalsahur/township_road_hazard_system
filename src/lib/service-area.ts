/**
 * Service area (roadmap step 2.1): where reports and, later, closures are accepted.
 * Stored as a GeoJSON polygon in config/service-areas/, read by the server
 * (src/lib/service-area-server.ts) and sent to browsers by GET /api/service-area.
 *
 * Routing for the way home covers whole trips through a separate routing provider
 * (roadmap phase 6), so the service area stays township-sized.
 * This file has no Node imports, so the browser can use it too.
 */

export type Position = [number, number]; // [longitude, latitude]
export type ServiceArea = {
  id: string;
  name: string;
  /** Outer ring first, then any holes. Every ring is closed (first point = last point). */
  rings: Position[][];
};
export type Bounds = { west: number; south: number; east: number; north: number };

/** Largest side allowed, in kilometres. A township is a few km across; this catches typos. */
export const MAX_AREA_SPAN_KM = 60;

/**
 * Bandar Bukit Raja default: the same rectangle the code used before step 2.1
 * (longitude 101.40–101.47, latitude 3.06–3.11). Research rectangle, not the official boundary.
 * config/service-areas/bbr.geojson must match this exactly (a test checks it).
 */
export const DEFAULT_SERVICE_AREA: ServiceArea = {
  id: "bbr",
  name: "Bandar Bukit Raja (demo area)",
  rings: [[[101.40, 3.06], [101.47, 3.06], [101.47, 3.11], [101.40, 3.11], [101.40, 3.06]]],
};

export const AREA_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Checks a GeoJSON Feature with a Polygon geometry and returns it as a ServiceArea, or throws a plain-English reason. */
export function parseServiceArea(input: unknown, expectedId?: string): ServiceArea {
  if (!input || typeof input !== "object") throw new Error("the file is not a GeoJSON object");
  const feature = input as { type?: unknown; properties?: unknown; geometry?: unknown };
  if (feature.type !== "Feature") throw new Error('it must be a single GeoJSON "Feature"');
  const properties = (feature.properties ?? {}) as { id?: unknown; name?: unknown };
  if (typeof properties.id !== "string" || !AREA_ID_PATTERN.test(properties.id)) throw new Error("properties.id must be lowercase letters, numbers or dashes");
  if (expectedId !== undefined && properties.id !== expectedId) throw new Error(`properties.id is "${properties.id}" but the file is for "${expectedId}"`);
  if (typeof properties.name !== "string" || properties.name.trim().length === 0 || properties.name.length > 80) throw new Error("properties.name must be 1–80 characters");
  const geometry = feature.geometry as { type?: unknown; coordinates?: unknown } | null;
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    throw new Error('geometry must be a "Polygon"');
  }
  const rings = geometry.coordinates.map((ring, index) => {
    if (!Array.isArray(ring) || ring.length < 4) throw new Error(`ring ${index + 1} needs at least 4 points`);
    const points = ring.map(point => {
      if (!Array.isArray(point) || point.length < 2 || !finite(point[0]) || !finite(point[1])) throw new Error("every point must be [longitude, latitude]");
      const [lon, lat] = point as number[];
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) throw new Error("a point is outside valid longitude or latitude");
      return [lon, lat] as Position;
    });
    const [first, last] = [points[0], points[points.length - 1]];
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error(`ring ${index + 1} is not closed (the last point must repeat the first)`);
    return points;
  });
  const area: ServiceArea = { id: properties.id, name: properties.name.trim(), rings };
  const { widthKm, heightKm } = areaSpanKm(area);
  if (widthKm < 0.05 || heightKm < 0.05) throw new Error("the area is too small (under 50 m across)");
  if (widthKm > MAX_AREA_SPAN_KM || heightKm > MAX_AREA_SPAN_KM) throw new Error(`the area is larger than ${MAX_AREA_SPAN_KM} km across`);
  return area;
}

export function areaBounds(area: ServiceArea): Bounds {
  const outer = area.rings[0];
  return {
    west: Math.min(...outer.map(p => p[0])), east: Math.max(...outer.map(p => p[0])),
    south: Math.min(...outer.map(p => p[1])), north: Math.max(...outer.map(p => p[1])),
  };
}

/** Middle of the bounds, as [longitude, latitude]. Used to centre maps. */
export function areaCenter(area: ServiceArea): Position {
  const b = areaBounds(area);
  return [(b.west + b.east) / 2, (b.south + b.north) / 2];
}

export function areaSpanKm(area: ServiceArea): { widthKm: number; heightKm: number } {
  const b = areaBounds(area);
  const kmPerDegree = 111.32;
  const midLat = ((b.south + b.north) / 2) * Math.PI / 180;
  return { widthKm: (b.east - b.west) * kmPerDegree * Math.cos(midLat), heightKm: (b.north - b.south) * kmPerDegree };
}

/** True when the point lies on the segment a–b (within a tiny tolerance). */
function onSegment([x, y]: Position, a: Position, b: Position): boolean {
  const cross = (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) > 1e-12) return false;
  return x >= Math.min(a[0], b[0]) - 1e-12 && x <= Math.max(a[0], b[0]) + 1e-12 &&
    y >= Math.min(a[1], b[1]) - 1e-12 && y <= Math.max(a[1], b[1]) + 1e-12;
}

function insideRing(point: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Is [longitude, latitude] inside the area? Points exactly on the outer edge count as inside,
 * matching the old rectangle check. Points inside a hole are outside.
 */
export function isInsideServiceArea(area: ServiceArea, longitude: number, latitude: number): boolean {
  if (!finite(longitude) || !finite(latitude)) return false;
  const b = areaBounds(area);
  if (longitude < b.west || longitude > b.east || latitude < b.south || latitude > b.north) return false;
  const point: Position = [longitude, latitude];
  const [outer, ...holes] = area.rings;
  const onOuterEdge = outer.some((p, i) => i > 0 && onSegment(point, outer[i - 1], p));
  if (!onOuterEdge && !insideRing(point, outer)) return false;
  return !holes.some(hole => insideRing(point, hole) && !hole.some((p, i) => i > 0 && onSegment(point, hole[i - 1], p)));
}

/** What GET /api/service-area returns. */
export type ServiceAreaResponse = {
  area: ServiceArea;
  bounds: Bounds;
  center: Position;
  /** Set when the configured area could not be used and BBR was used instead. */
  fallbackReason: string | null;
  configuredId: string;
};

export function serviceAreaResponse(area: ServiceArea, configuredId: string, fallbackReason: string | null): ServiceAreaResponse {
  return { area, bounds: areaBounds(area), center: areaCenter(area), fallbackReason, configuredId };
}
