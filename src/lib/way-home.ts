/**
 * Way home settings kept in this browser only (roadmap 6.3): the home pin and where checks start.
 * Never sent to our server except inside a route check, and never stored there.
 */
import { isLonLat, type LonLat } from "./routing";

export const WAY_HOME_KEY = "laluan.wayHome.v1";
export type WayHomeStart = { kind: "here" } | { kind: "place"; at: LonLat };
export type WayHomeSettings = { home: LonLat; start: WayHomeStart };

/** Reads the stored settings defensively; anything malformed counts as "not set". */
export function parseWayHome(raw: string | null): WayHomeSettings | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const { home, start } = value as { home?: unknown; start?: { kind?: unknown; at?: unknown } };
  if (!isLonLat(home)) return null;
  if (start?.kind === "place" && isLonLat(start.at)) return { home: [home[0], home[1]], start: { kind: "place", at: [start.at[0], start.at[1]] } };
  return { home: [home[0], home[1]], start: { kind: "here" } };
}

/** Five decimals (about 1 m) is plenty for a route, and keeps less detail in the browser. */
const trim = (p: LonLat): LonLat => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
export function serializeWayHome(settings: WayHomeSettings): string {
  return JSON.stringify({ home: trim(settings.home), start: settings.start.kind === "place" ? { kind: "place", at: trim(settings.start.at) } : { kind: "here" } });
}
