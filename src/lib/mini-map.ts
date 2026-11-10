import type { RoadFeature } from "./bbr-roads";

/** Size of the report mini map drawing, in SVG units (it scales to fit its box). */
export const MINI_MAP_WIDTH = 480;
export const MINI_MAP_HEIGHT = 180;
const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link"]);

/**
 * Road lines inside a small window centred on a report, projected into the mini map box.
 * The window is about 900 m wide; roads that only pass outside it are left out.
 */
export function miniMapPaths(roads: readonly RoadFeature[], longitude: number, latitude: number, spanLon = 0.008) {
  const W = MINI_MAP_WIDTH, H = MINI_MAP_HEIGHT;
  const kx = W / spanLon;
  const ky = kx / Math.cos((latitude * Math.PI) / 180);
  const spanLat = H / ky;
  const inside = ([x, y]: [number, number]) => Math.abs(x - longitude) <= spanLon && Math.abs(y - latitude) <= spanLat;
  return roads.filter(road => road.geometry.coordinates.some(inside)).map(road => ({
    id: road.properties.id,
    major: MAJOR.has(road.properties.highway),
    d: road.geometry.coordinates
      .map(([x, y], i) => `${i ? "L" : "M"}${((x - longitude) * kx + W / 2).toFixed(1)},${(H / 2 - (y - latitude) * ky).toFixed(1)}`)
      .join(""),
  }));
}
