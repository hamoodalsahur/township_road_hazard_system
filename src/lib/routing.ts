/**
 * Way home (roadmap phase 6): the routing rules, with no network, database or browser access.
 * The provider itself (OpenRouteService, or recorded answers in tests) lives in routing-server.ts.
 *
 * - Trips can start anywhere (decided 10 Nov 2026); the service area only limits reports and closures.
 * - Active closures become thin "avoid" shapes around each closed road line.
 * - Start and home points are used for the answer only, never stored or logged.
 */
export type LonLat = [number, number];
export type RouteLine = { distanceM: number; durationS: number; coordinates: LonLat[] };
export type AvoidShape = { type: "MultiPolygon"; coordinates: LonLat[][][] };

/** A routing provider answers one route request. `null` means no route exists (for example everything is closed). */
export interface RoutingProvider {
  readonly name: string;
  route(from: LonLat, to: LonLat, avoid?: AvoidShape): Promise<RouteLine | null>;
}
/** The provider cannot answer right now (no key, limit reached, network down). Never "no route". */
export class RoutingUnavailable extends Error {}

export const MAX_TRIP_KM = 300;
export const MIN_TRIP_M = 50;
export const CLOSURE_BUFFER_M = 12;
const M_PER_DEG = 111_320;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export function isLonLat(v: unknown): v is LonLat {
  return Array.isArray(v) && v.length === 2 && finite(v[0]) && finite(v[1]) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
}

/** Straight-line distance in metres (good enough at township and trip scale). */
export function metres(a: LonLat, b: LonLat): number {
  const k = Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  return Math.hypot((a[0] - b[0]) * k, a[1] - b[1]) * M_PER_DEG;
}

/** Checks POST /api/v2/route. Throws a plain-English reason. */
export function validateRouteRequest(input: unknown): { from: LonLat; to: LonLat } {
  if (!input || typeof input !== "object") throw new Error("Invalid route request");
  const { from, to } = input as Record<string, unknown>;
  if (!isLonLat(from) || !isLonLat(to)) throw new Error("Invalid start or home point");
  const d = metres(from, to);
  if (d < MIN_TRIP_M) throw new Error("You are already home");
  if (d > MAX_TRIP_KM * 1000) throw new Error(`Invalid trip: start and home are more than ${MAX_TRIP_KM} km apart`);
  return { from: [from[0], from[1]], to: [to[0], to[1]] };
}

/** Local flat projection around a point, in metres. */
function projector(origin: LonLat) {
  const k = Math.cos(origin[1] * Math.PI / 180);
  return {
    to: ([lon, lat]: LonLat): [number, number] => [(lon - origin[0]) * k * M_PER_DEG, (lat - origin[1]) * M_PER_DEG],
    from: ([x, y]: [number, number]): LonLat => [origin[0] + x / (k * M_PER_DEG), origin[1] + y / M_PER_DEG],
  };
}

/**
 * One thin rectangle around every segment of every closed road (buffer on both sides and the ends),
 * as a GeoJSON MultiPolygon for the provider's "avoid polygons" option.
 */
export function closureAvoidShape(lines: readonly (readonly LonLat[])[], bufferM = CLOSURE_BUFFER_M): AvoidShape | null {
  const polygons: LonLat[][][] = [];
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      const p = projector(a);
      const [bx, by] = p.to(b);
      const len = Math.hypot(bx, by);
      if (len < 0.5) continue;
      const ux = bx / len, uy = by / len, nx = -uy * bufferM, ny = ux * bufferM, ex = ux * bufferM, ey = uy * bufferM;
      const corners: [number, number][] = [[-ex + nx, -ey + ny], [bx + ex + nx, by + ey + ny], [bx + ex - nx, by + ey - ny], [-ex - nx, -ey - ny]];
      const ring = corners.map(c => p.from(c).map(v => Math.round(v * 1e7) / 1e7) as LonLat);
      polygons.push([[...ring, ring[0]]]);
    }
  }
  return polygons.length ? { type: "MultiPolygon", coordinates: polygons } : null;
}

/** Distance in metres from a point to a segment, in a flat projection around the point. */
function pointSegmentM(pt: LonLat, a: LonLat, b: LonLat): number {
  const p = projector(pt);
  const [ax, ay] = p.to(a), [bx, by] = p.to(b);
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/**
 * How many metres of a closed road the route runs along. Points every 5 m along the closed road count
 * when the route passes within `toleranceM`. Crossing a closed road at a junction covers only a few metres.
 */
export function metresAlong(route: readonly LonLat[], closed: readonly LonLat[], toleranceM = 10): { covered: number; length: number } {
  let covered = 0, length = 0;
  for (let i = 1; i < closed.length; i++) {
    const a = closed[i - 1], b = closed[i];
    const seg = metres(a, b);
    length += seg;
    const steps = Math.max(1, Math.round(seg / 5));
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const pt: LonLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      let near = false;
      for (let j = 1; j < route.length && !near; j++) near = pointSegmentM(pt, route[j - 1], route[j]) <= toleranceM;
      if (near) covered += seg / steps;
    }
  }
  return { covered, length };
}

/** The route uses a closed road when it runs along at least 25 m of it (or most of a very short one). */
export function usesClosedRoad(route: readonly LonLat[], closed: readonly LonLat[]): boolean {
  const { covered, length } = metresAlong(route, closed);
  return length > 0 && covered >= Math.min(25, length * 0.6);
}

export type WayHomeStatus = "clear" | "affected" | "blocked" | "no_route";
export type WayHomeClosure = { id: string; title: string; kindLabel: string; endsAt: string };
export type WayHomeAnswer = {
  status: WayHomeStatus;
  usual: RouteLine | null;
  detour: RouteLine | null;
  closures: WayHomeClosure[];
  provider: string;
  checkedAt: string;
};

/** Minutes, rounded, never below 1. */
export const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
/** "+4 min", or "about the same time" when the detour adds under half a minute. */
export function extraTime(usualS: number, detourS: number): string {
  const extra = Math.round(Math.max(0, detourS - usualS) / 60);
  return extra === 0 ? "about the same time" : `+${extra} min`;
}
export const km = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

/** The card's headline and detail line for an answer. */
export function wayHomeText(answer: Pick<WayHomeAnswer, "status" | "usual" | "detour" | "closures">): { title: string; detail: string } {
  const first = answer.closures[0];
  const closed = first ? `${first.title} is ${first.kindLabel === "One lane only" ? "down to one lane" : "closed"}${answer.closures.length > 1 ? ` (and ${answer.closures.length - 1} more)` : ""}` : "";
  if (answer.status === "no_route") return { title: "No route found", detail: "The route service could not find a way between these points." };
  if (answer.status === "clear") return { title: "Your way home is clear", detail: answer.usual ? `${minutes(answer.usual.durationS)} min, ${km(answer.usual.distanceM)}` : "" };
  if (answer.status === "blocked") return { title: "No way home found around the closure", detail: `${closed}. Try again later.` };
  const extra = answer.detour && answer.usual ? extraTime(answer.usual.durationS, answer.detour.durationS) : "";
  return { title: "Your way home is affected", detail: `${closed}. Detour ${answer.detour ? `${minutes(answer.detour.durationS)} min (${extra})` : ""}` };
}

/** Rate limit: at most `limit` route checks per key per minute. Returns true when allowed. In memory, per server. */
export function makeRateLimiter(limit = 10, windowMs = 60_000) {
  const hits = new Map<string, number[]>();
  return (key: string, now: number = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
    if (recent.length >= limit) { hits.set(key, recent); return false; }
    recent.push(now); hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}

export type ActiveClosureLines = { id: string; title: string; kindLabel: string; endsAt: string; lines: LonLat[][] };

/**
 * The way-home check: the usual route first; if it runs along an active closure, ask again with every
 * active closure as an avoid shape. A detour that still uses a closed road counts as no way found.
 */
export async function checkWayHome(provider: RoutingProvider, from: LonLat, to: LonLat, closures: readonly ActiveClosureLines[], now: Date = new Date()): Promise<WayHomeAnswer> {
  const base = { provider: provider.name, checkedAt: now.toISOString() };
  const usual = await provider.route(from, to);
  if (!usual) return { ...base, status: "no_route", usual: null, detour: null, closures: [] };
  const hit = closures.filter(c => c.lines.some(line => usesClosedRoad(usual.coordinates, line)));
  const summary = hit.map(({ id, title, kindLabel, endsAt }) => ({ id, title, kindLabel, endsAt }));
  if (hit.length === 0) return { ...base, status: "clear", usual, detour: null, closures: [] };
  const avoid = closureAvoidShape(closures.flatMap(c => c.lines));
  const detour = avoid ? await provider.route(from, to, avoid) : null;
  const stillClosed = detour ? closures.some(c => c.lines.some(line => usesClosedRoad(detour.coordinates, line))) : true;
  if (!detour || stillClosed) return { ...base, status: "blocked", usual, detour: null, closures: summary };
  return { ...base, status: "affected", usual, detour, closures: summary };
}
