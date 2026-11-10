"use client";

import { useMapEvents, MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, Polyline, Polygon, useMap, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import { HAZARD_SYMBOLS } from "@/lib/hazard-symbols";
import { useEffect } from "react";
import { bbrReferencePoints, isValidLonLat } from "@/lib/bbr-reference";
import { roadStyle } from "@/lib/bbr-road-display";
import {candidateVicinityColor,type CandidateVicinityStroke} from "@/lib/v215-road-vicinity";
import type { RoadFeature } from "@/lib/bbr-roads";
import type { DemoHazard } from "@/lib/demo-hazards";
import { DEFAULT_SERVICE_AREA, areaCenter, type ServiceAreaResponse } from "@/lib/service-area";

function FocusSelectedNode({ selectedNodePosition }: { selectedNodePosition: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedNodePosition) return;
    const [longitude, latitude] = selectedNodePosition;
    map.setView([latitude, longitude], 16, { animate: false });
  }, [map, selectedNodePosition?.[0], selectedNodePosition?.[1]]);
  return null;
}

function FocusSelectedGroup({ roads, focusGroup }: { roads: RoadFeature[]; focusGroup: number }) {
  const map = useMap();
  useEffect(() => {
    if (focusGroup === 0 || roads.length === 0) return;
    const points = roads.flatMap(road => road.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]));
    if (points.length > 0) map.fitBounds(points, { padding: [24, 24], maxZoom: 16 });
  }, [map, roads, focusGroup]);
  return null;
}

/** Shows the whole active service area once it is known (only when the area itself changes). */
function FocusServiceArea({ areaId, bounds }: { areaId: string; bounds: ServiceAreaResponse["bounds"] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [16, 16], maxZoom: 16, animate: false });
  }, [map, areaId]);
  return null;
}

function LocationPicker({ onChooseLocation }: {onChooseLocation?: (coordinates:[number,number])=>void}) {
  useMapEvents({ click(event) { onChooseLocation?.([event.latlng.lng,event.latlng.lat]); } });
  return null;
}
function markerIcon(category: keyof typeof HAZARD_SYMBOLS, selected: boolean) {
  const info = HAZARD_SYMBOLS[category];
  // Only fixed, trusted symbols and colors are interpolated; no report text or user HTML.
  return divIcon({
    className: "hazard-map-marker",
    html: `<span class="hazard-map-marker__symbol${selected ? " hazard-map-marker__symbol--selected" : ""}" style="--hazard-color:${info.color}" aria-hidden="true">${info.symbol}</span>`,
    iconSize: [42, 46],
    iconAnchor: [21, 43],
    popupAnchor: [0, -40],
  });
}
const features = bbrReferencePoints.features.filter(feature => isValidLonLat(feature.geometry.coordinates));

export default function GeographicReferenceMap({
  roads = [],
  vicinityStrokes = [],
  selectedRoadId,
  onSelectRoad,
  focusGroup = 0,
  selectedNodePosition = null,
  hazards = [],
  approvedPhotoIds = [],
  onSelectHazard = () => {},
  selectedHazardId = null,
  onChooseLocation,
  selectedLocation = null,
  serviceArea,
}: {
  serviceArea?: ServiceAreaResponse;
  roads?: RoadFeature[];
  vicinityStrokes?: readonly CandidateVicinityStroke[];
  selectedRoadId: string | null;
  onSelectRoad: (id: string) => void;
  focusGroup?: number;
  selectedNodePosition?: [number, number] | null;
  hazards?: DemoHazard[];
  approvedPhotoIds?: readonly string[];
  onSelectHazard?: (id: string) => void;
  selectedHazardId?: string | null;
  onChooseLocation?: (coordinates:[number,number])=>void;
  selectedLocation?: [number,number] | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
      <MapContainer
        center={[(serviceArea?.center ?? areaCenter(DEFAULT_SERVICE_AREA))[1], (serviceArea?.center ?? areaCenter(DEFAULT_SERVICE_AREA))[0]]} zoom={14} minZoom={9} maxZoom={18}
        scrollWheelZoom={false} zoomControl={false}
        className="h-[390px] w-full bg-slate-100 sm:h-[520px] lg:h-[570px]"
        aria-label="Geographic context near Bandar Bukit Raja; not a flood or road safety map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ZoomControl position="topright" />
        <LocationPicker onChooseLocation={onChooseLocation} />
        {serviceArea ? <>
          <FocusServiceArea areaId={serviceArea.area.id} bounds={serviceArea.bounds} />
          {/* Where reports are accepted. Not a road status; drawn faintly so roads stay readable. */}
          <Polygon positions={serviceArea.area.rings.map(ring => ring.map(([lon, lat]) => [lat, lon] as [number, number]))} interactive={false}
            pathOptions={{ color: "#0F1513", weight: 1.5, opacity: 0.45, dashArray: "6 6", fill: false }} />
        </> : null}
        {selectedLocation ? <CircleMarker center={[selectedLocation[1],selectedLocation[0]]} radius={10} pathOptions={{color:"#0B7350",fillColor:"#95D2B6",fillOpacity:1,weight:3}}><Tooltip permanent>Draft demo report location</Tooltip></CircleMarker>:null}
        <FocusSelectedGroup roads={roads} focusGroup={focusGroup} />
        <FocusSelectedNode selectedNodePosition={selectedNodePosition} />
        {selectedNodePosition ? <CircleMarker
          center={[selectedNodePosition[1], selectedNodePosition[0]]} radius={10}
          pathOptions={{ color: "#b45309", fillColor: "#fbbf24", fillOpacity: 0.9, weight: 3 }}>
          <Tooltip permanent>Mapped OSM node — review only</Tooltip>
        </CircleMarker> : null}
        {roads.map(road => {
          const selected = selectedRoadId === road.properties.id;
          return (
            <Polyline key={road.properties.id}
              positions={road.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number])}
              pathOptions={selected ? { color: "#2563eb", weight: 7, opacity: 1 } : roadStyle(road.properties.highway)}
              eventHandlers={{ click: () => onSelectRoad(road.properties.id) }}>
              <Tooltip sticky>{road.properties.name} · click for source details</Tooltip>
            </Polyline>
          );
        })}
        {vicinityStrokes.map(stroke=>(
          <Polyline key={stroke.reportId+"-"+stroke.wayId}
            positions={stroke.points.map(([lon,lat])=>[lat,lon] as [number,number])}
            pathOptions={{color:candidateVicinityColor(stroke.impact),weight:8,opacity:0.92,dashArray:"10 6"}}
            eventHandlers={{click:()=>onSelectRoad(stroke.wayId)}}>
            <Tooltip sticky>
              Fictional human-corroborated report vicinity · {stroke.impact.replaceAll("_"," ")} · about {stroke.approximateMetres} m from unverified OSM line.
              NOT a verified road obstruction, closure or navigable road status.
            </Tooltip>
          </Polyline>
        ))}
        {hazards.map(hazard => (
          <Marker key={hazard.id} position={[hazard.coordinates[1], hazard.coordinates[0]]}
            icon={markerIcon(hazard.category, selectedHazardId === hazard.id)}
            eventHandlers={{ click: () => onSelectHazard(hazard.id) }}
            keyboard
            title={`Fictional ${HAZARD_SYMBOLS[hazard.category].label} report. Click for details.`}>
            <Tooltip direction="top" offset={[0, -32]}>DEMO · {HAZARD_SYMBOLS[hazard.category].label} · {hazard.title}</Tooltip>
            <Popup maxWidth={280} minWidth={200} autoPan>
              <div className="space-y-2 text-sm">
                <p className="text-xs font-bold uppercase text-amber-900">Fictional report · unverified</p>
                <p className="font-semibold">{hazard.title}</p>
                <p className="text-slate-700">{hazard.description}</p>
                {approvedPhotoIds.includes(hazard.id) ? (
                  <figure className="rounded-lg border border-teal-200 p-2">
                    <img src={`/api/v2/hazards/${encodeURIComponent(hazard.id)}/evidence/approved`}
                      alt={`Approved fictional sample for ${HAZARD_SYMBOLS[hazard.category].label}`}
                      loading="eager" className="max-h-48 w-full rounded-md object-contain" />
                    <figcaption className="mt-1 text-xs text-teal-900">Operator-approved sample image · not verified road evidence</figcaption>
                  </figure>
                ) : <p className="text-xs text-slate-600">No public-demo-approved photo available.</p>}
                <p className="text-xs font-medium text-slate-600">Illustrative position only. No live obstruction or closure is confirmed.</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {features.map(feature => {
          const [longitude, latitude] = feature.geometry.coordinates;
          return (
            <CircleMarker key={feature.properties.id} center={[latitude, longitude]} radius={8}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0B7350", fillOpacity: 1 }}>
              <Tooltip>{feature.properties.name} · source-linked reference only</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
