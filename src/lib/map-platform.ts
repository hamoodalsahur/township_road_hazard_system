/**
 * Map platform (roadmap 3.1–3.2): MapLibre with OpenFreeMap's quiet "Positron" style, pin clustering,
 * and a legend that only lists what is on screen. Pure helpers, shared by every map and tested directly
 * (tests/map-platform.test.ts). No React or browser access here.
 */
import Supercluster, { type ClusterProperties } from "supercluster";
import { SEVERITY, severityOf, type Severity } from "./hazard-presentation";
import { roadCategory } from "./bbr-road-display";
import type { RoadFeature } from "./bbr-roads";
import type { ServiceArea } from "./service-area";

/** OpenFreeMap public instance: free, no key, no cookies. Credit is added by MapLibre from the style. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
export const MAP_MIN_ZOOM = 10;
export const MAP_MAX_ZOOM = 19;

export type PinPoint = { id: string; category: string; impact: string; reviewState: string; longitude: number; latitude: number };
export type Bounds4 = [west: number, south: number, east: number, north: number];

export type MapItem =
  | { kind: "pin"; point: PinPoint }
  | { kind: "cluster"; id: number; longitude: number; latitude: number; count: number; impact: string; waiting: number; expansionZoom: number };

type PinProps = { id: string; rank: number; impact: string; waiting: number };

/**
 * Groups pins that would overlap at the current zoom. A cluster takes the colour of its most serious
 * report and counts how many still need checking. The selected pin is never hidden inside a cluster.
 */
export function clusterPins(points: readonly PinPoint[], bounds: Bounds4, zoom: number, selectedId: string | null = null, radius = 44): MapItem[] {
  const byId = new Map(points.map(point => [point.id, point]));
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const index = new Supercluster<PinProps, { rank: number; impact: string; waiting: number }>({
    radius, maxZoom: MAP_MAX_ZOOM - 1, minPoints: 2,
    map: props => ({ rank: props.rank, impact: props.impact, waiting: props.waiting }),
    reduce: (total, props) => {
      if (props.rank > total.rank) { total.rank = props.rank; total.impact = props.impact; }
      total.waiting += props.waiting;
    },
  });
  index.load(points.filter(point => point !== selected).map(point => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [point.longitude, point.latitude] },
    properties: { id: point.id, rank: severityOf(point.impact).rank, impact: point.impact, waiting: point.reviewState === "unverified" ? 1 : 0 },
  })));
  const items: MapItem[] = index.getClusters(bounds, Math.floor(zoom)).map(feature => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const props = feature.properties as Partial<ClusterProperties> & Partial<PinProps> & { rank?: number };
    if (props.cluster && typeof props.cluster_id === "number") {
      return { kind: "cluster", id: props.cluster_id, longitude, latitude, count: props.point_count ?? 0, impact: props.impact ?? "unknown",
        waiting: props.waiting ?? 0, expansionZoom: Math.min(index.getClusterExpansionZoom(props.cluster_id), MAP_MAX_ZOOM) };
    }
    return { kind: "pin", point: byId.get(props.id as string)! };
  });
  if (selected && inside(bounds, selected)) items.push({ kind: "pin", point: selected });
  return items;
}

export function inside([west, south, east, north]: Bounds4, point: { longitude: number; latitude: number }): boolean {
  return point.longitude >= west && point.longitude <= east && point.latitude >= south && point.latitude <= north;
}

/** The legend lists only what is on screen (DESIGN.md section 10): severities present, most serious first, and the fill states present. */
export function legendFor(points: readonly PinPoint[]): { severities: Severity[]; waiting: boolean; confirmed: boolean } {
  const keys = new Set(points.map(point => severityOf(point.impact).key));
  return {
    severities: Object.values(SEVERITY).filter(severity => keys.has(severity.key)).sort((a, b) => b.rank - a.rank),
    waiting: points.some(point => point.reviewState !== "corroborated"),
    confirmed: points.some(point => point.reviewState === "corroborated"),
  };
}

/** The service area's rings as lines (drawn dashed, never filled, so roads stay readable). */
export function areaOutline(area: ServiceArea) {
  return {
    type: "FeatureCollection" as const,
    features: area.rings.map((ring, index) => ({ type: "Feature" as const, properties: { ring: index }, geometry: { type: "LineString" as const, coordinates: ring } })),
  };
}

/** Road lines with the properties the map styles and clicks use: id, name, class and whether it is selected. */
export function roadLayerData(roads: readonly RoadFeature[], selectedId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: roads.map(road => ({
      type: "Feature" as const,
      geometry: road.geometry,
      properties: { id: road.properties.id, name: road.properties.name || "Unnamed road", cls: roadCategory(road.properties.highway), selected: road.properties.id === selectedId },
    })),
  };
}

/** Bounds of a set of [longitude, latitude] points, or null when there are none. */
export function boundsOf(points: readonly (readonly [number, number])[]): Bounds4 | null {
  if (points.length === 0) return null;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [lon, lat] of points) { west = Math.min(west, lon); east = Math.max(east, lon); south = Math.min(south, lat); north = Math.max(north, lat); }
  return [west, south, east, north];
}
