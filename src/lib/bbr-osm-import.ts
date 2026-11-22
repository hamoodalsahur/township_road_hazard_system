import type { RoadFeature } from "./bbr-roads";

/** Small rectangular study window, NOT the official BBR township boundary. */
export const RESEARCH_BOUNDS = { south: 3.075, west: 101.42, north: 3.095, east: 101.45 };

export type OsmWay = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  nodes?: unknown;
  geometry?: { lat: number; lon: number }[];
};

const RETAINED_TAGS = ["oneway", "bridge", "tunnel", "layer", "access", "motor_vehicle", "junction"] as const;

export type OsmBounds = { south: number; west: number; north: number; east: number };

/** Turns one Overpass way into a road line, or null. Points must lie within `bounds` plus `margin` degrees. */
export function convertOsmWay(element: OsmWay, bounds: OsmBounds = RESEARCH_BOUNDS, margin = 0.02): RoadFeature | null {
  if (element.type !== "way" || !Number.isSafeInteger(element.id) || element.id <= 0 || !Array.isArray(element.geometry)) return null;
  const coordinates = element.geometry.map(point => [point.lon, point.lat] as [number, number]);
  if (coordinates.length < 2 || coordinates.length > 5000 || coordinates.some(([lon, lat]) =>
    !Number.isFinite(lon) || !Number.isFinite(lat) ||
    lat < bounds.south - margin || lat > bounds.north + margin ||
    lon < bounds.west - margin || lon > bounds.east + margin
  )) return null;

  // A malformed node array must not be paired with otherwise valid geometry.
  // Older Overpass responses without nodes still yield reference-only geometry.
  if (element.nodes !== undefined && (
    !Array.isArray(element.nodes) || element.nodes.length !== coordinates.length ||
    !element.nodes.every(id => Number.isSafeInteger(id) && id > 0)
  )) return null;

  const tags = element.tags ?? {};
  const retained = Object.fromEntries(RETAINED_TAGS.filter(tag =>
    typeof tags[tag] === "string" && tags[tag].length <= 120
  ).map(tag => [tag, tags[tag]]));

  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: {
      id: "osm-way-" + element.id,
      name: tags.name || "Unnamed mapped road",
      highway: tags.highway || "unknown",
      sourceUrl: "https://www.openstreetmap.org/way/" + element.id,
      verification: "osm_unverified",
      ...(element.nodes === undefined ? {} : { osmNodeIds: element.nodes as number[] }),
      ...retained,
    },
  };
}
