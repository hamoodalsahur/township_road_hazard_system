"use client";

import { useEffect, useMemo } from "react";
import { Layer, Marker, Source, useMap } from "@vis.gl/react-maplibre";
import { HouseIcon } from "@phosphor-icons/react";
import { boundsOf } from "@/lib/map-platform";
import type { LonLat, WayHomeAnswer } from "@/lib/routing";

export const DETOUR_COLOR = "#1F5A94";

/**
 * Way home on the map (roadmap 6.4): the usual way dotted grey, the detour in blue with a white casing,
 * the home pin and the starting point. Fits the trip once per new answer.
 */
export default function RouteLines({ answer, home, from, padding = { top: 140, bottom: 80 } }: { answer: WayHomeAnswer | null; home: LonLat | null; from: LonLat | null; padding?: { top: number; bottom: number } }) {
  const { current: map } = useMap();
  const data = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: [
      ...(answer?.usual ? [{ type: "Feature" as const, properties: { kind: answer.detour ? "usual-affected" : "usual" }, geometry: { type: "LineString" as const, coordinates: answer.usual.coordinates } }] : []),
      ...(answer?.detour ? [{ type: "Feature" as const, properties: { kind: "detour" }, geometry: { type: "LineString" as const, coordinates: answer.detour.coordinates } }] : []),
    ],
  }), [answer]);
  useEffect(() => {
    if (!map || !answer) return;
    const b = boundsOf([...(answer.usual?.coordinates ?? []), ...(answer.detour?.coordinates ?? [])]);
    if (!b) return;
    const fit = () => map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: padding.top, bottom: padding.bottom, left: 40, right: 40 }, maxZoom: 16, duration: 600 });
    // Wait for the map to finish its own first fit, so the trip is what stays on screen.
    if (map.loaded()) fit(); else map.once("load", fit);
  }, [map, answer?.checkedAt, padding.top, padding.bottom]);
  return <>
    <Source id="way-home" type="geojson" data={data}>
      {/* A clear route is drawn solid; when there is a detour, the usual way becomes dotted. */}
      <Layer id="way-usual-casing" type="line" filter={["==", ["get", "kind"], "usual"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#FFFFFF", "line-width": 9 }} />
      <Layer id="way-usual" type="line" filter={["==", ["get", "kind"], "usual"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#0E1720", "line-width": 5, "line-opacity": 0.85 }} />
      <Layer id="way-usual-dots" type="line" filter={["==", ["get", "kind"], "usual-affected"]} layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": "#46525E", "line-width": 4, "line-dasharray": [0.1, 2.2], "line-opacity": 0.9 }} />
      <Layer id="way-detour-casing" type="line" filter={["==", ["get", "kind"], "detour"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#FFFFFF", "line-width": 10 }} />
      <Layer id="way-detour" type="line" filter={["==", ["get", "kind"], "detour"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": DETOUR_COLOR, "line-width": 6 }} />
    </Source>
    {from ? <Marker longitude={from[0]} latitude={from[1]} anchor="center">
      <span role="img" aria-label="Start of the trip" className="block h-[18px] w-[18px] rounded-full border-4 border-night bg-white shadow" />
    </Marker> : null}
    {home ? <Marker longitude={home[0]} latitude={home[1]} anchor="center" style={{ zIndex: 6 }}>
      <span role="img" aria-label="Your home" className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-night text-night-mint shadow-[0_4px_12px_-4px_rgba(14,23,32,.6)]">
        <HouseIcon size={16} weight="bold" aria-hidden="true" /></span>
    </Marker> : null}
  </>;
}
