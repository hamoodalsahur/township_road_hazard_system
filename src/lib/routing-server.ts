// Server only: talks to the routing provider. The API key never leaves the server.
import { RoutingUnavailable, isLonLat, metres, type AvoidShape, type LonLat, type RouteLine, type RoutingProvider } from "./routing";
import { RECORDED_BBR_TRIP } from "./routing-recorded";

export const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

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

export type RoutingConfig = { provider: RoutingProvider | null; reason: string | null };
/**
 * ROUTING_PROVIDER: "openrouteservice" (default when a key is set), "recorded" (tests and screenshots) or "off".
 * Without a key the way-home card says it is not set up yet; nothing else changes.
 */
export function routingConfig(env: Record<string, string | undefined> = process.env, fetcher?: typeof fetch): RoutingConfig {
  const choice = (env.ROUTING_PROVIDER ?? "").trim().toLowerCase() || (env.OPENROUTESERVICE_API_KEY ? "openrouteservice" : "off");
  if (choice === "recorded") return { provider: recordedProvider(), reason: null };
  if (choice === "off") return { provider: null, reason: "Way home is not set up on this server yet (no route service key)." };
  if (choice === "openrouteservice") {
    const key = (env.OPENROUTESERVICE_API_KEY ?? "").trim();
    if (!key) return { provider: null, reason: "Way home needs OPENROUTESERVICE_API_KEY in .env." };
    return { provider: openRouteService(key, fetcher), reason: null };
  }
  return { provider: null, reason: `Unknown ROUTING_PROVIDER "${choice.slice(0, 30)}".` };
}
