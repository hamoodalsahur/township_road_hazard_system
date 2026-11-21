import type { RoadFeature } from "./bbr-roads";

/**
 * The Overview "Where" map: a still drawing of road lines with the reports on top.
 * It fits the reports into a box, so every pin is visible; it is not a full map (that is Maps).
 * Road lines are unverified OpenStreetMap data and are only drawn, never changed.
 */
export type MapView = { width: number; height: number; centerLon: number; centerLat: number; kx: number; ky: number };
type Point = { longitude: number; latitude: number };

const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link"]);

/**
 * A view that shows every point with `padding` (in drawing units) around them.
 * At least `minSpanLon` degrees wide (about 1.3 km), so a single report still shows its streets.
 */
export function fitView(points: readonly Point[], width: number, height: number, padding = 56, minSpanLon = 0.012): MapView | null {
  const valid = points.filter(p => Number.isFinite(p.longitude) && Number.isFinite(p.latitude));
  if (valid.length === 0) return null;
  const lons = valid.map(p => p.longitude), lats = valid.map(p => p.latitude);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const centerLon = (minLon + maxLon) / 2, centerLat = (minLat + maxLat) / 2;
  const cos = Math.cos((centerLat * Math.PI) / 180);
  // Degrees of longitude per drawing unit, chosen so both directions fit.
  const spanLon = Math.max(maxLon - minLon, minSpanLon);
  const spanLatAsLon = (maxLat - minLat) / cos;
  const perUnit = Math.max(spanLon / Math.max(1, width - 2 * padding), spanLatAsLon / Math.max(1, height - 2 * padding));
  const kx = 1 / perUnit;
  return { width, height, centerLon, centerLat, kx, ky: kx / cos };
}

/** Drawing position of a point, in the view's units (0..width, 0..height). */
export function project(view: MapView, longitude: number, latitude: number): { x: number; y: number } {
  return { x: (longitude - view.centerLon) * view.kx + view.width / 2, y: view.height / 2 - (latitude - view.centerLat) * view.ky };
}

/** The same position as percentages of the box, for placing HTML pins over the drawing. */
export function projectPercent(view: MapView, longitude: number, latitude: number): { left: number; top: number } {
  const { x, y } = project(view, longitude, latitude);
  return { left: (x / view.width) * 100, top: (y / view.height) * 100 };
}

/** Road lines that pass through the view, as SVG paths. */
export function viewRoadPaths(roads: readonly RoadFeature[], view: MapView) {
  const margin = 40;
  const visible = ([lon, lat]: [number, number]) => {
    const { x, y } = project(view, lon, lat);
    return x >= -margin && x <= view.width + margin && y >= -margin && y <= view.height + margin;
  };
  return roads.filter(road => road.geometry.coordinates.some(visible)).map(road => ({
    id: road.properties.id,
    major: MAJOR.has(road.properties.highway),
    d: road.geometry.coordinates.map(([lon, lat], i) => {
      const { x, y } = project(view, lon, lat);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(""),
  }));
}
