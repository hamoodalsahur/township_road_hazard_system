"use client";

import { useMemo, useState } from "react";
import { Layer, Source, type MapLayerMouseEvent } from "@vis.gl/react-maplibre";
import BaseMap from "@/components/maps/BaseMap";
import HazardPins from "@/components/maps/HazardPins";
import { boundsOf, type Bounds4 } from "@/lib/map-platform";
import { CLOSURE_COLOR } from "@/lib/road-closures";
import type { RoadFeature } from "@/lib/bbr-roads";
import type { ServiceAreaResponse } from "@/lib/service-area";

const PAD = 0.0025; // about 250 m around the reports

/** Map inside "Close roads": nearby roads in blue, chosen ones drawn as closed. Click a road to add or remove it. */
export default function ClosurePickerMap({ area, points, category, impact, candidates, selected, onToggle }: {
  area: ServiceAreaResponse;
  points: [number, number][];
  category: string;
  impact: string;
  candidates: readonly RoadFeature[];
  selected: readonly string[];
  onToggle: (wayId: string) => void;
}) {
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const b = boundsOf(points);
  const fit: Bounds4 = b ? [b[0] - PAD, b[1] - PAD, b[2] + PAD, b[3] + PAD] : [area.bounds.west, area.bounds.south, area.bounds.east, area.bounds.north];
  const data = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: candidates.map(road => ({ type: "Feature" as const, geometry: road.geometry,
      properties: { id: road.properties.id, name: road.properties.name || "Unnamed road", on: selected.includes(road.properties.id) } })),
  }), [candidates, selected]);
  const pins = useMemo(() => points.map((p, i) => ({ id: `source-${i}`, category, impact, reviewState: "corroborated", longitude: p[0], latitude: p[1] })), [points, category, impact]);

  function click(event: MapLayerMouseEvent) {
    const id = event.features?.[0]?.properties?.id;
    if (typeof id === "string") onToggle(id);
  }
  function move(event: MapLayerMouseEvent) {
    const name = event.features?.[0]?.properties?.name;
    setHover(typeof name === "string" ? { name, x: event.point.x, y: event.point.y } : null);
  }

  return <>
    <BaseMap fit={fit} fitKey={points.map(p => p.join(",")).join("|")} label="Map of roads near the report. Click a road to add it to the closure or remove it."
      onClick={click} onMouseMove={move} onMouseLeave={() => setHover(null)} interactiveLayerIds={["pick-hit"]} cursor={hover ? "pointer" : undefined}>
      <Source id="pick" type="geojson" data={data}>
        <Layer id="pick-nearby" type="line" filter={["!", ["get", "on"]]} layout={{ "line-cap": "round" }} paint={{ "line-color": "#1F5A94", "line-width": 7, "line-opacity": 0.35 }} />
        <Layer id="pick-casing" type="line" filter={["get", "on"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#FFFFFF", "line-width": 12 }} />
        <Layer id="pick-on" type="line" filter={["get", "on"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": CLOSURE_COLOR, "line-width": 7 }} />
        <Layer id="pick-dash" type="line" filter={["get", "on"]} paint={{ "line-color": "#FFFFFF", "line-width": 2, "line-dasharray": [2, 2.5] }} />
        <Layer id="pick-hit" type="line" paint={{ "line-color": "#000", "line-opacity": 0, "line-width": 16 }} />
      </Source>
      <HazardPins points={pins} interactive={false} describe={() => "approved"} />
    </BaseMap>
    {hover ? <span aria-hidden="true" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg bg-night px-2.5 py-1 text-caption text-night-text"
      style={{ left: hover.x, top: hover.y }}>{hover.name}</span> : null}
  </>;
}
