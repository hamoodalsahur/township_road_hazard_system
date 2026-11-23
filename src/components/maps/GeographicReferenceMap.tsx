"use client";

import { useEffect, useMemo, useState } from "react";
import { Layer, Marker, Source, useMap, type MapLayerMouseEvent } from "@vis.gl/react-maplibre";
import BaseMap from "./BaseMap";
import HazardPins from "./HazardPins";
import ClosureLines from "@/components/closures/ClosureLines";
import type { PublicClosure } from "@/lib/road-closures";
import { reviewStateOf } from "@/lib/hazard-presentation";
import { bbrReferencePoints, isValidLonLat } from "@/lib/bbr-reference";
import { candidateVicinityColor, type CandidateVicinityStroke } from "@/lib/v215-road-vicinity";
import { areaOutline, boundsOf, roadLayerData, type PinPoint } from "@/lib/map-platform";
import type { RoadFeature } from "@/lib/bbr-roads";
import type { DemoHazard } from "@/lib/demo-hazards";
import type { ServiceAreaResponse } from "@/lib/service-area";

const referencePoints = {
  type: "FeatureCollection" as const,
  features: bbrReferencePoints.features.filter(feature => isValidLonLat(feature.geometry.coordinates))
    .map(feature => ({ type: "Feature" as const, geometry: feature.geometry, properties: { name: feature.properties.name } })),
};
// Road-inspection mode (DESIGN.md section 10): thin ink lines, weight by road class, the selected road in green.
// MapLibre only allows "zoom" at the top of an expression, so the selected-road width sits inside each stop.
const ROAD_WIDTH = ["interpolate", ["linear"], ["zoom"],
  12, ["case", ["get", "selected"], 5, ["match", ["get", "cls"], "major", 2, "local", 1.2, 0.8]],
  17, ["case", ["get", "selected"], 9, ["match", ["get", "cls"], "major", 6, "local", 4, 2.5]]] as const;

/** Zooms to a node picked in the research sections. */
function FocusNode({ position }: { position: [number, number] | null }) {
  const { current: map } = useMap();
  useEffect(() => { if (map && position) map.flyTo({ center: position, zoom: 17, duration: 500 }); }, [map, position?.[0], position?.[1]]);
  return null;
}
/** Fits a candidate road group when one is picked. */
function FocusGroup({ roads, group }: { roads: RoadFeature[]; group: number }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map || group === 0) return;
    const b = boundsOf(roads.flatMap(road => road.geometry.coordinates));
    if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 48, maxZoom: 17, duration: 500 });
  }, [map, roads, group]);
  return null;
}

/**
 * Management Maps stage map on MapLibre and OpenFreeMap Positron (roadmap 3.1). Draws the service area,
 * road lines when road-inspection mode is on, the dashed vicinity of approved reports, BBR reference points
 * and clustered report pins. Clicking a road selects it; while adding a report, clicking the map places it.
 */
export default function GeographicReferenceMap({
  roads = [], vicinityStrokes = [], selectedRoadId, onSelectRoad, focusGroup = 0, selectedNodePosition = null, hazards = [],
  onSelectHazard = () => {}, selectedHazardId = null, onChooseLocation, selectedLocation = null, serviceArea, reviewStates = {}, onVisibleChange, closures = [],
}: {
  serviceArea: ServiceAreaResponse;
  roads?: RoadFeature[];
  vicinityStrokes?: readonly CandidateVicinityStroke[];
  selectedRoadId: string | null;
  onSelectRoad: (id: string) => void;
  focusGroup?: number;
  selectedNodePosition?: [number, number] | null;
  hazards?: DemoHazard[];
  onSelectHazard?: (id: string) => void;
  selectedHazardId?: string | null;
  onChooseLocation?: (coordinates: [number, number]) => void;
  selectedLocation?: [number, number] | null;
  /** Review state per report id, so pins are outlined (needs review) or solid (approved). */
  reviewStates?: Readonly<Record<string, string>>;
  /** Reports inside the current view, for the legend. */
  onVisibleChange?: (visible: PinPoint[]) => void;
  /** Road closures active now (roadmap 5.1). */
  closures?: readonly PublicClosure[];
}) {
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const points: PinPoint[] = useMemo(() => hazards.map(h => ({ id: h.id, category: h.category, impact: h.impact, reviewState: reviewStates[h.id] ?? "unverified", longitude: h.coordinates[0], latitude: h.coordinates[1] })), [hazards, reviewStates]);
  const roadData = useMemo(() => roadLayerData(roads, selectedRoadId), [roads, selectedRoadId]);
  const vicinity = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: vicinityStrokes.map(s => ({ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: s.points }, properties: { color: candidateVicinityColor(s.impact), wayId: s.wayId } })),
  }), [vicinityStrokes]);
  const b = serviceArea.bounds;
  const choosing = !!onChooseLocation;

  function click(event: MapLayerMouseEvent) {
    if (choosing) { onChooseLocation?.([event.lngLat.lng, event.lngLat.lat]); return; }
    const feature = event.features?.[0];
    const id = feature?.properties?.id ?? feature?.properties?.wayId;
    if (typeof id === "string") onSelectRoad(id);
  }
  function move(event: MapLayerMouseEvent) {
    const name = event.features?.[0]?.properties?.name;
    setHover(typeof name === "string" && !choosing ? { name, x: event.point.x, y: event.point.y } : null);
  }

  return <>
    <BaseMap fit={[b.west, b.south, b.east, b.north]} fitKey={serviceArea.area.id} label="Map of the service area with fictional report pins. Not a flood or road safety map."
      onClick={click} onMouseMove={move} onMouseLeave={() => setHover(null)} interactiveLayerIds={["roads-hit", "vicinity-line"]}
      cursor={choosing ? "crosshair" : hover ? "pointer" : undefined}>
      <Source id="area" type="geojson" data={areaOutline(serviceArea.area)}>
        <Layer id="area-line" type="line" paint={{ "line-color": "#0E1720", "line-width": 1.5, "line-opacity": 0.5, "line-dasharray": [3, 3] }} />
      </Source>
      <Source id="roads" type="geojson" data={roadData}>
        <Layer id="roads-line" type="line" layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{ "line-color": ["case", ["get", "selected"], "#0B7350", "#1A2129"], "line-opacity": ["case", ["get", "selected"], 1, 0.55],
            "line-width": ROAD_WIDTH as never }} />
        {/* Wider invisible copy, so thin lines are easy to click. */}
        <Layer id="roads-hit" type="line" paint={{ "line-color": "#000", "line-opacity": 0, "line-width": 14 }} />
      </Source>
      <Source id="vicinity" type="geojson" data={vicinity}>
        <Layer id="vicinity-line" type="line" paint={{ "line-color": ["get", "color"], "line-width": 7, "line-opacity": 0.92, "line-dasharray": [1.6, 1] }} />
      </Source>
      <ClosureLines closures={closures} />
      <Source id="reference-points" type="geojson" data={referencePoints}>
        <Layer id="reference-points" type="circle" paint={{ "circle-radius": 6, "circle-color": "#0B7350", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 }} />
      </Source>
      <HazardPins points={points} selectedId={selectedHazardId} onSelect={onSelectHazard} interactive={!choosing}
        describe={point => reviewStateOf(point.reviewState).label} onVisibleChange={onVisibleChange} />
      {selectedLocation ? <Marker longitude={selectedLocation[0]} latitude={selectedLocation[1]} anchor="center">
        <span role="img" aria-label="Where the new report will go" className="block h-6 w-6 rounded-full border-[3px] border-[#0B7350] bg-[#95D2B6] shadow" />
      </Marker> : null}
      {selectedNodePosition ? <Marker longitude={selectedNodePosition[0]} latitude={selectedNodePosition[1]} anchor="center">
        <span role="img" aria-label="Selected OpenStreetMap node, for review only" className="block h-5 w-5 rounded-full border-[3px] border-[#B45309] bg-[#FBBF24]" />
      </Marker> : null}
      <FocusNode position={selectedNodePosition} />
      <FocusGroup roads={roads} group={focusGroup} />
    </BaseMap>
    {hover ? <span aria-hidden="true" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg bg-night px-2.5 py-1 text-caption text-night-text"
      style={{ left: hover.x, top: hover.y }}>{hover.name}</span> : null}
  </>;
}
