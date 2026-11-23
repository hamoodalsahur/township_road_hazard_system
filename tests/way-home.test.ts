import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RoutingUnavailable, checkWayHome, closureAvoidShape, extraTime, makeRateLimiter, metresAlong, usesClosedRoad, validateRouteRequest, wayHomeText,
  type AvoidShape, type LonLat, type RouteLine, type RoutingProvider,
} from "../src/lib/routing";
import { openRouteService, recordedProvider, routingConfig, ORS_URL } from "../src/lib/routing-server";
import { RECORDED_BBR_TRIP } from "../src/lib/routing-recorded";
import { WAY_HOME_KEY, parseWayHome, serializeWayHome } from "../src/lib/way-home";

// Roadmap phase 6: way home with OpenRouteService (decision G6). Tests never call the real service.
const read = (file: string) => readFileSync(file, "utf8");
const trip = RECORDED_BBR_TRIP;
// The closed way in the recorded trip (Jalan Makyong 6/KU5), from the committed BBR reference lines.
const reference = JSON.parse(read("data/bbr-roads-reference.geojson")) as { features: { properties: { id: string }; geometry: { coordinates: LonLat[] } }[] };
const closedLine = (): LonLat[] => reference.features.find(f => f.properties.id === trip.closedWayId)!.geometry.coordinates;
const closure = (lines: LonLat[][]) => ({ id: "c1", title: "Jalan Makyong 6/KU5", kindLabel: "Closed to cars", endsAt: "2026-11-23T16:40:00.000Z", lines });
const fake = (answers: { usual: RouteLine | null; detour: RouteLine | null }, seen: (AvoidShape | undefined)[] = []): RoutingProvider =>
  ({ name: "Fake", async route(_f, _t, avoid) { seen.push(avoid); return avoid ? answers.detour : answers.usual; } });

test("a trip needs two valid points, at least 50 m and at most 300 km apart; it may start outside the service area", () => {
  assert.deepEqual(validateRouteRequest({ from: [101.69, 3.07], to: [101.43, 3.09] }).from, [101.69, 3.07], "from Kuala Lumpur to BBR is fine");
  assert.throws(() => validateRouteRequest({ from: [101.43, 3.08], to: [101.43, 3.08001] }), /already home/);
  assert.throws(() => validateRouteRequest({ from: [100.3, 5.4], to: [103.8, 1.3] }), /more than 300 km/);
  assert.throws(() => validateRouteRequest({ from: [200, 3], to: [101, 3] }), /Invalid start or home/);
  assert.throws(() => validateRouteRequest(null), /Invalid route request/);
});

test("running along a closed road counts; crossing it at a junction does not", () => {
  const along = closedLine();
  assert.equal(usesClosedRoad(trip.usual.coordinates, along), true);
  const cross: LonLat[] = [[along[0][0] - 0.0005, along[0][1] + 0.0002], [along[0][0] + 0.0005, along[0][1] - 0.0002]];
  const crossing: LonLat[] = [[cross[0][0] + 0.00025, cross[0][1] + 0.0008], [cross[0][0] + 0.00025, cross[0][1] - 0.0008]];
  assert.equal(usesClosedRoad(crossing, cross), false, "a few metres where the route crosses");
  assert.ok(metresAlong(trip.usual.coordinates, along).covered > 25);
  assert.equal(usesClosedRoad(trip.detour.coordinates, along), false, "the recorded detour avoids it");
});

test("every closed segment becomes one closed rectangle about 24 m wide", () => {
  const shape = closureAvoidShape([[[101.43, 3.08], [101.431, 3.08], [101.432, 3.0805]]])!;
  assert.equal(shape.type, "MultiPolygon");
  assert.equal(shape.coordinates.length, 2);
  const ring = shape.coordinates[0][0];
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring[4], "rings are closed");
  const widthM = Math.abs(ring[0][1] - ring[3][1]) * 111320;
  assert.ok(widthM > 22 && widthM < 26, `width ${widthM}`);
  assert.equal(closureAvoidShape([]), null);
});

test("clear, affected, blocked and no route", async () => {
  const usual = trip.usual, detour = trip.detour, lines = [closedLine()];
  assert.equal((await checkWayHome(fake({ usual, detour }), trip.start, trip.home, [])).status, "clear");
  const seen: (AvoidShape | undefined)[] = [];
  const affected = await checkWayHome(fake({ usual, detour }, seen), trip.start, trip.home, [closure(lines)]);
  assert.equal(affected.status, "affected");
  assert.equal(affected.closures[0].title, "Jalan Makyong 6/KU5");
  assert.equal(seen[0], undefined, "the usual route is asked for without avoid shapes");
  assert.equal(seen[1]?.type, "MultiPolygon", "the detour is asked for with them");
  assert.equal((await checkWayHome(fake({ usual, detour: null }), trip.start, trip.home, [closure(lines)])).status, "blocked");
  assert.equal((await checkWayHome(fake({ usual, detour: usual }), trip.start, trip.home, [closure(lines)])).status, "blocked", "a detour that still uses the closed road is not offered");
  assert.equal((await checkWayHome(fake({ usual: null, detour: null }), trip.start, trip.home, [])).status, "no_route");
  const far = [[[trip.home[0] + 0.05, trip.home[1] + 0.05], [trip.home[0] + 0.051, trip.home[1] + 0.05]]] as LonLat[][];
  assert.equal((await checkWayHome(fake({ usual, detour }), trip.start, trip.home, [closure(far)])).status, "clear", "a closure elsewhere does not affect the trip");
});

test("the card's words", () => {
  const base = { usual: trip.usual, detour: trip.detour, closures: [{ id: "c1", title: "Jalan A", kindLabel: "Closed to cars", endsAt: "2026-11-23T16:40:00.000Z" }] };
  assert.match(wayHomeText({ ...base, status: "clear", detour: null, closures: [] }).title, /clear/);
  assert.match(wayHomeText({ ...base, status: "affected" }).detail, /^Jalan A is closed\. Detour 8 min \(\+1 min\)$/);
  assert.match(wayHomeText({ ...base, status: "blocked", detour: null }).title, /No way home found/);
  assert.equal(extraTime(600, 620), "about the same time");
  assert.equal(extraTime(600, 900), "+5 min");
});

test("OpenRouteService gets the key in a header, the points and avoid shapes in the body, and its errors become plain words", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const reply = (status: number, body: unknown) => (async (url: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(url), init: init! }); return new Response(JSON.stringify(body), { status }); }) as typeof fetch;
  const ok = openRouteService("test-key", reply(200, { features: [{ geometry: { coordinates: trip.usual.coordinates }, properties: { summary: { distance: 3175, duration: 457 } } }] }));
  const line = await ok.route(trip.start, trip.home, { type: "MultiPolygon", coordinates: [] });
  assert.equal(line?.distanceM, 3175);
  assert.equal(calls[0].url, ORS_URL);
  assert.equal(ORS_URL, "https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson", "the current HeiGIT address");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "test-key");
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body.coordinates, [trip.start, trip.home]);
  assert.equal(body.options.avoid_polygons.type, "MultiPolygon");
  assert.equal(String(calls[0].url).includes("test-key"), false, "the key is never in the address");
  assert.equal(await openRouteService("k", reply(404, { error: { code: 2009, message: "Route could not be found" } })).route(trip.start, trip.home), null);
  await assert.rejects(openRouteService("k", reply(403, { error: "Access to this API has been disallowed" })).route(trip.start, trip.home), (e: unknown) => e instanceof RoutingUnavailable && /key was refused/.test((e as Error).message));
  await assert.rejects(openRouteService("k", reply(429, {})).route(trip.start, trip.home), /allowance is used up/);
});

test("the provider comes from settings: OpenRouteService with a key, recorded for tests, otherwise off", async () => {
  assert.equal(routingConfig({}).provider?.name, "your area's road lines", "without a key, local roads are used");
  assert.equal(routingConfig({ ROUTING_PROVIDER: "off" }).provider, null);
  assert.match(routingConfig({ ROUTING_PROVIDER: "off" }).reason ?? "", /not set up/);
  assert.equal(routingConfig({ ROUTING_PROVIDER: "local", OPENROUTESERVICE_API_KEY: "abc" }).provider?.name, "your area's road lines", "local can be chosen even with a key");
  assert.equal(routingConfig({ OPENROUTESERVICE_API_KEY: "abc" }).provider?.name, "OpenRouteService");
  assert.match(routingConfig({ ROUTING_PROVIDER: "openrouteservice" }).reason ?? "", /OPENROUTESERVICE_API_KEY/);
  assert.equal(routingConfig({ ROUTING_PROVIDER: "recorded" }).provider?.name, "Recorded test routes");
  assert.equal(await recordedProvider().route(trip.start, trip.home), trip.usual);
  await assert.rejects(recordedProvider().route([100, 5], trip.home), /one recorded trip/);
  assert.match(read(".env.example"), /^# OPENROUTESERVICE_API_KEY=""$/m, "the example never holds a key");
});

test("at most 10 checks a minute from one address", () => {
  const allow = makeRateLimiter(10, 60_000);
  for (let i = 0; i < 10; i++) assert.equal(allow("a", 1000 + i), true);
  assert.equal(allow("a", 2000), false);
  assert.equal(allow("b", 2000), true, "others are not affected");
  assert.equal(allow("a", 62_000), true, "a minute later it is allowed again");
});

test("home is kept in this browser only, rounded to about 1 m, and bad values are ignored", () => {
  assert.equal(WAY_HOME_KEY, "laluan.wayHome.v1");
  const saved = serializeWayHome({ home: [101.4291461, 3.0904744], start: { kind: "place", at: [101.4440999, 3.076219] } });
  assert.deepEqual(JSON.parse(saved), { home: [101.42915, 3.09047], start: { kind: "place", at: [101.4441, 3.07622] } });
  assert.deepEqual(parseWayHome(saved)?.start.kind, "place");
  assert.equal(parseWayHome("{bad"), null);
  assert.equal(parseWayHome(JSON.stringify({ home: [500, 3] })), null);
  assert.deepEqual(parseWayHome(JSON.stringify({ home: [101, 3], start: { kind: "place" } }))?.start, { kind: "here" }, "a broken place falls back to 'where I am'");
});

test("the route API stores and logs nothing, uses POST so points never sit in addresses, and the screens say who sees the points", () => {
  const api = read("src/app/api/v2/route/route.ts");
  assert.match(api, /export async function POST/);
  assert.doesNotMatch(api, /export async function GET/);
  assert.doesNotMatch(api, /console\.|\.create\(|\.update\(|auditEntry/, "no logging and no writes");
  assert.match(api, /allow\(who\)/);
  assert.match(read("src/hooks/useWayHome.ts"), /fetch\("\/api\/v2\/route", \{ method: "POST"/);
  assert.match(read("src/components/resident/WayHomeSetup.tsx"), /or OpenRouteService\); we don&apos;t keep them/);
  assert.doesNotMatch(read("src/lib/routing-recorded.ts"), /5\.71|100\.43/, "never the owner's own area");
  assert.match(read("src/hooks/useWayHome.ts"), /settings\.start\.kind === "place"[\s\S]*permissions\?\.query/, "location is only used without asking when already allowed");
});

test("the card and the routes are on the resident map; setup has its own page", () => {
  assert.match(read("src/components/resident/ResidentMapPage.tsx"), /<WayHomeCard state=\{way\}/);
  assert.match(read("src/components/resident/ResidentMap.tsx"), /<RouteLines answer=\{wayHome\.answer\}/);
  assert.match(read("src/app/resident/home/page.tsx"), /<WayHomeSetup \/>/);
});
