/**
 * Local roads routing (owner's choice, 23 Nov 2026, while the OpenRouteService key is refused):
 * shortest drive over the area's own road lines in the database, with no key and nothing leaving the PC.
 * Only trips inside the area's road map. Unverified OSM lines: not real travel advice.
 *
 * Pure: give it road features and two points; tests/local-routes.test.ts runs it on the BBR reference lines.
 */
import type { RoadFeature } from "./bbr-roads";
import { metres, type AvoidShape, type LonLat, type RouteLine } from "./routing";

/** Typical speeds in km/h by road class, for travel time only. */
const SPEED: Record<string, number> = {
  motorway: 80, motorway_link: 50, trunk: 60, trunk_link: 40, primary: 50, primary_link: 35, secondary: 45, secondary_link: 30,
  tertiary: 35, tertiary_link: 25, unclassified: 25, residential: 25, living_street: 10, service: 15, services: 15,
};
/** How far a start or home may be from the nearest road line, in metres. */
export const MAX_SNAP_M = 300;

type Edge = { to: number; metres: number; seconds: number; mid: LonLat };
export type RoadGraph = { points: LonLat[]; edges: Edge[][] };

const key = ([lon, lat]: LonLat) => `${lon.toFixed(7)},${lat.toFixed(7)}`;

/** Junctions are shared vertices. One-way streets get one direction only; "access=no" and tracks are left out. */
export function buildRoadGraph(features: readonly RoadFeature[]): RoadGraph {
  const index = new Map<string, number>();
  const points: LonLat[] = [];
  const edges: Edge[][] = [];
  const node = (p: LonLat) => {
    const k = key(p);
    let i = index.get(k);
    if (i === undefined) { i = points.length; index.set(k, i); points.push([p[0], p[1]]); edges.push([]); }
    return i;
  };
  for (const f of features) {
    const { highway, oneway, access, motor_vehicle, junction } = f.properties;
    const speed = SPEED[highway];
    if (!speed || access === "no" || motor_vehicle === "no") continue;
    const forwardOnly = oneway === "yes" || oneway === "1" || oneway === "true" || junction === "roundabout";
    const backwardOnly = oneway === "-1";
    const c = f.geometry.coordinates;
    for (let i = 1; i < c.length; i++) {
      const a = node(c[i - 1]), b = node(c[i]);
      if (a === b) continue;
      const m = metres(c[i - 1], c[i]);
      const s = m / (speed / 3.6);
      const mid: LonLat = [(c[i - 1][0] + c[i][0]) / 2, (c[i - 1][1] + c[i][1]) / 2];
      if (!backwardOnly) edges[a].push({ to: b, metres: m, seconds: s, mid });
      if (!forwardOnly) edges[b].push({ to: a, metres: m, seconds: s, mid });
    }
  }
  return { points, edges };
}

function insideRing(p: LonLat, ring: readonly LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** An edge is avoided when its middle lies inside any avoid polygon (the thin rectangles around closed roads). */
function blocked(avoid: AvoidShape | undefined, p: LonLat): boolean {
  return !!avoid && avoid.coordinates.some(polygon => insideRing(p, polygon[0]));
}

function nearest(graph: RoadGraph, p: LonLat): { node: number; metres: number } | null {
  let best = -1, bestM = Infinity;
  for (let i = 0; i < graph.points.length; i++) {
    if (graph.edges[i].length === 0) continue;
    const m = metres(p, graph.points[i]);
    if (m < bestM) { bestM = m; best = i; }
  }
  return best < 0 ? null : { node: best, metres: bestM };
}

/** Smallest-first queue for Dijkstra. */
class Heap {
  private items: [number, number][] = [];
  get size() { return this.items.length; }
  push(item: [number, number]) {
    const a = this.items; a.push(item);
    for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop(): [number, number] {
    const a = this.items, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

export class OutsideRoadMap extends Error {}

/** Fastest drive between two points over the graph, skipping avoided edges. `null` when no way exists. */
export function localRoute(graph: RoadGraph, from: LonLat, to: LonLat, avoid?: AvoidShape): RouteLine | null {
  const start = nearest(graph, from), end = nearest(graph, to);
  if (!start || start.metres > MAX_SNAP_M) throw new OutsideRoadMap(`The start is ${start ? Math.round(start.metres) : "?"} m from the nearest road line in your area`);
  if (!end || end.metres > MAX_SNAP_M) throw new OutsideRoadMap(`Home is ${end ? Math.round(end.metres) : "?"} m from the nearest road line in your area`);
  const n = graph.points.length;
  const time = new Float64Array(n).fill(Infinity), dist = new Float64Array(n), prev = new Int32Array(n).fill(-1);
  time[start.node] = 0;
  const heap = new Heap(); heap.push([0, start.node]);
  while (heap.size) {
    const [t, u] = heap.pop();
    if (t > time[u]) continue;
    if (u === end.node) break;
    for (const e of graph.edges[u]) {
      if (blocked(avoid, e.mid)) continue;
      const nt = t + e.seconds;
      if (nt < time[e.to]) { time[e.to] = nt; dist[e.to] = dist[u] + e.metres; prev[e.to] = u; heap.push([nt, e.to]); }
    }
  }
  if (time[end.node] === Infinity) return null;
  const path: LonLat[] = [];
  for (let v = end.node; v !== -1; v = prev[v]) path.push(graph.points[v]);
  path.reverse();
  // The bit between each point and its nearest road line counts at driveway speed (15 km/h).
  const access = start.metres + end.metres;
  return { distanceM: dist[end.node] + access, durationS: time[end.node] + access / (15 / 3.6), coordinates: [from, ...path, to] };
}
