// Server only: talks to the routing provider. The API key never leaves the server.
import { RoutingUnavailable, isLonLat, metres, type AvoidShape, type LonLat, type RouteLine, type RoutingProvider } from "./routing";
import { RECORDED_BBR_TRIP } from "./routing-recorded";
import { OutsideRoadMap, buildRoadGraph, localRoute, type RoadGraph } from "./local-router";
import type { RoadFeature } from "./bbr-roads";

// api.openrouteservice.org is being retired in favour of api.heigit.org (HeiGIT, Nov 2026). Same key, same answers.
export const ORS_URL = "https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson";

/** OpenRouteService (decision G6, 23 Nov 2026): hosted, free daily allowance, key in OPENROUTESERVICE_API_KEY. */
export function openRouteService(apiKey: string, fetcher: typeof fetch = fetch): RoutingProvider {
  return {
    name: "OpenRouteService",
    async route(from: LonLat, to: LonLat, avoid?: AvoidShape): Promise<RouteLine | null> {
      let response: Response;
      try {
        response = await fetcher(ORS_URL, {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json", Accept: "application/geo+json, application/json" },
          body: JSON.stringify({ coordinates: [from, to], instructions: false, ...(avoid ? { options: { avoid_polygons: avoid } } : {}) }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new RoutingUnavailable("The route service did not answer. Check the internet connection and try again.");
      }
      const data = await response.json().catch(() => null) as
        | { features?: { geometry?: { coordinates?: unknown }; properties?: { summary?: { distance?: number; duration?: number } } }[]; error?: { code?: number; message?: string } }
        | null;
      // 2009/2010: no route between the points (for example everything around is avoided). Not a failure of the service.
      if (!response.ok && (data?.error?.code === 2009 || data?.error?.code === 2010)) return null;
      if (response.status === 401 || response.status === 403) throw new RoutingUnavailable("The OpenRouteService key was refused. Check OPENROUTESERVICE_API_KEY in .env.");
      if (response.status === 429) throw new RoutingUnavailable("Today's free route allowance is used up. Try again later.");
      if (!response.ok || !data) throw new RoutingUnavailable("The route service could not answer right now.");
      const feature = data.features?.[0];
      const coordinates = Array.isArray(feature?.geometry?.coordinates) ? (feature!.geometry!.coordinates as unknown[]).filter(isLonLat) as LonLat[] : [];
      const summary = feature?.properties?.summary;
      if (coordinates.length < 2 || typeof summary?.distance !== "number") return null;
      return { distanceM: summary.distance, durationS: summary.duration ?? 0, coordinates };
    },
  };
}

/** Recorded answers for tests and screenshots: the one fictional BBR trip, with and without avoid shapes. Never calls the network. */
export function recordedProvider(): RoutingProvider {
  const trip = RECORDED_BBR_TRIP;
  return {
    name: "Recorded test routes",
    async route(from, to, avoid) {
      if (metres(from, trip.start) > 300 || metres(to, trip.home) > 300) {
        throw new RoutingUnavailable("Test mode only knows one recorded trip in the BBR demo area.");
      }
      return avoid ? trip.detour : trip.usual;
    },
  };
}

/**
 * Local roads (owner's choice, 23 Nov 2026): routes over the active area's own road lines, read from the
 * database (or the area's file before the first import). No key, no network. Only trips inside the area.
 */
export function localRoadsProvider(load?: () => Promise<{ areaId: string; features: RoadFeature[] }>): RoutingProvider {
  let cached: { key: string; graph: RoadGraph; at: number } | null = null;
  const loadRoads = load ?? (async () => {
    const { loadActiveRoads } = await import("./road-lines-server");
    const roads = await loadActiveRoads();
    return { areaId: roads.areaId, features: roads.collection?.features ?? [] };
  });
  return {
    name: "your area's road lines",
    async route(from, to, avoid) {
      if (!cached || Date.now() - cached.at > 60_000) {
        const { areaId, features } = await loadRoads();
        if (features.length === 0) throw new RoutingUnavailable("There are no road lines for this area yet. Run npm run db:import-roads.");
        const key = `${areaId}:${features.length}:${features[0]?.properties.id}`;
        cached = cached?.key === key ? { ...cached, at: Date.now() } : { key, graph: buildRoadGraph(features), at: Date.now() };
      }
      try { return localRoute(cached.graph, from, to, avoid); }
      catch (error) {
        if (error instanceof OutsideRoadMap) throw new RoutingUnavailable(`Local routes only cover your area's roads. ${error.message}.`);
        throw error;
      }
    },
  };
}

export type RoutingConfig = { provider: RoutingProvider | null; reason: string | null };
/**
 * ROUTING_PROVIDER: "local" (your area's road lines; the default without a key), "openrouteservice"
 * (the default when a key is set), "recorded" (tests and screenshots) or "off".
 */
export function routingConfig(env: Record<string, string | undefined> = process.env, fetcher?: typeof fetch): RoutingConfig {
  const choice = (env.ROUTING_PROVIDER ?? "").trim().toLowerCase() || (env.OPENROUTESERVICE_API_KEY ? "openrouteservice" : "local");
  if (choice === "recorded") return { provider: recordedProvider(), reason: null };
  if (choice === "local") return { provider: localRoadsProvider(), reason: null };
  if (choice === "off") return { provider: null, reason: "Way home is not set up on this server yet (no route service key)." };
  if (choice === "openrouteservice") {
    const key = (env.OPENROUTESERVICE_API_KEY ?? "").trim();
    if (!key) return { provider: null, reason: "Way home needs OPENROUTESERVICE_API_KEY in .env." };
    return { provider: openRouteService(key, fetcher), reason: null };
  }
  return { provider: null, reason: `Unknown ROUTING_PROVIDER "${choice.slice(0, 30)}".` };
}
