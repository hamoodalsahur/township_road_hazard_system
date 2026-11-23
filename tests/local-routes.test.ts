import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_SNAP_M, OutsideRoadMap, buildRoadGraph, localRoute } from "../src/lib/local-router";
import { localRoadsProvider } from "../src/lib/routing-server";
import { checkWayHome, closureAvoidShape, usesClosedRoad, RoutingUnavailable, type LonLat } from "../src/lib/routing";
import { RECORDED_BBR_TRIP as trip } from "../src/lib/routing-recorded";
import type { RoadFeature } from "../src/lib/bbr-roads";

// Local roads routing: the area's own road lines, no key, nothing leaves the PC (owner's choice, 23 Nov 2026).
const roads = (JSON.parse(readFileSync("data/bbr-roads-reference.geojson", "utf8")) as { features: RoadFeature[] }).features;
const graph = buildRoadGraph(roads);
const closed = roads.find(r => r.properties.id === trip.closedWayId)!.geometry.coordinates as LonLat[];
const road = (id: string, coords: LonLat[], extra: Partial<RoadFeature["properties"]> = {}): RoadFeature => ({ type: "Feature", geometry: { type: "LineString", coordinates: coords },
  properties: { id, name: id, highway: "residential", sourceUrl: "https://www.openstreetmap.org/way/1", verification: "osm_unverified", ...extra } });

test("it finds a drive between the recorded trip's points over the BBR lines", () => {
  const line = localRoute(graph, trip.start, trip.home)!;
  assert.ok(line.coordinates.length > 10);
  assert.ok(line.distanceM > 2000 && line.distanceM < 6000, `${line.distanceM} m`);
  assert.ok(line.durationS > 60);
  assert.deepEqual(line.coordinates[0], trip.start);
  assert.deepEqual(line.coordinates.at(-1), trip.home);
});

test("with a closure as avoid shapes, the route goes around the closed road", () => {
  const usual = localRoute(graph, trip.start, trip.home)!;
  const detour = localRoute(graph, trip.start, trip.home, closureAvoidShape([closed])!)!;
  assert.equal(usesClosedRoad(detour.coordinates, closed), false);
  assert.ok(detour.durationS >= usual.durationS - 1);
});

test("one-way streets are only driven one way, and roads closed to all traffic are left out", () => {
  const g = buildRoadGraph([road("a", [[0, 0], [0.001, 0]], { oneway: "yes" }), road("b", [[0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]), road("x", [[0, 0], [0, -0.001]], { access: "no" })]);
  const forward = localRoute(g, [0, 0], [0.001, 0])!;
  assert.equal(forward.coordinates.length, 4, "straight along the one-way street");
  const back = localRoute(g, [0.001, 0], [0, 0])!;
  assert.ok(back.distanceM > 250, "the long way round, never against the one-way");
  assert.ok(localRoute(g, [0, 0], [0, -0.001])!.distanceM > 0, "the start of a closed road still snaps to the network");
  assert.equal(buildRoadGraph([road("x", [[0, 0], [0, 0.001]], { access: "no" })]).edges.every(e => e.length === 0), true);
});

test("points far from any road line are refused with a plain reason, and an empty area says what to run", async () => {
  assert.throws(() => localRoute(graph, [101.0, 3.0], trip.home), (e: unknown) => e instanceof OutsideRoadMap && /m from the nearest road line/.test((e as Error).message));
  assert.equal(MAX_SNAP_M, 300);
  await assert.rejects(localRoadsProvider(async () => ({ areaId: "x", features: [] })).route(trip.start, trip.home), (e: unknown) => e instanceof RoutingUnavailable && /db:import-roads/.test((e as Error).message));
  await assert.rejects(localRoadsProvider(async () => ({ areaId: "bbr", features: roads })).route([101.0, 3.0], trip.home), /only cover your area's roads/);
});

test("the way-home check works end to end on local roads: clear, then affected with a detour", async () => {
  const provider = localRoadsProvider(async () => ({ areaId: "bbr", features: roads }));
  assert.equal((await checkWayHome(provider, trip.start, trip.home, [])).status, "clear");
  const answer = await checkWayHome(provider, trip.start, trip.home, [{ id: "c1", title: "Jalan Makyong 6/KU5", kindLabel: "Closed to cars", endsAt: "2026-11-23T16:00:00Z", lines: [closed] }]);
  assert.equal(answer.status, "affected");
  assert.equal(usesClosedRoad(answer.detour!.coordinates, closed), false);
});
