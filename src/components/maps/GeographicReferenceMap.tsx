"use client";

import { useMapEvents, MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, Polyline, Polygon, useMap, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { HAZARD_SYMBOLS } from "@/lib/hazard-symbols";
import { useEffect } from "react";
import HazardMarker from "@/components/hazards/HazardMarker";
import { categoryLabel, reviewStateOf, severityOf } from "@/lib/hazard-presentation";
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
// The same pins as everywhere else (DESIGN.md section 7): glyph = category, colour = severity,
// outlined while being checked and solid once approved. Built from fixed props only (category,
// impact, review state), never from report text, so no user HTML reaches the map.
const iconCache = new Map<string, ReturnType<typeof divIcon>>();
function markerIcon(category: string, impact: string, reviewState: string, selected: boolean) {
  const key = [category, impact, reviewState, selected].join("|");
  let icon = iconCache.get(key);
  if (!icon) {
    const size = selected ? 48 : 40;
    const html = renderToStaticMarkup(<HazardMarker category={category} impact={impact} reviewState={reviewState} selected={selected} size={size} decorative />);
    icon = divIcon({ className: "hazard-map-pin", html, iconSize: [46 * size / 42, 52 * size / 42], iconAnchor: [23 * size / 42, 44 * size / 42], popupAnchor: [0, -40 * size / 42] });
    iconCache.set(key, icon);
  }
  return icon;
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
  reviewStates = {},
  layout = "card",
  popups = true,
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
  /** Review state per report id, so pins are outlined (needs review) or solid (approved). */
  reviewStates?: Readonly<Record<string, string>>;
  /** "card": the boxed map on the resident page. "fill": fills its parent (management Maps stage). */
  layout?: "card" | "fill";
  /** Pop-up details on the pins. The Maps stage shows details in its own side panel instead. */
  popups?: boolean;
}) {
  const fill = layout === "fill";
  // `isolate` keeps Leaflet's own layers (z-index 400 to 1000) inside the map, so they never cover
  // the sticky top bar or the floating panels of the Maps stage.
  return (
    <div className={fill ? "isolate h-full w-full" : "isolate overflow-hidden rounded-2xl border border-slate-200 shadow-inner"}>
      <MapContainer
        center={[(serviceArea?.center ?? areaCenter(DEFAULT_SERVICE_AREA))[1], (serviceArea?.center ?? areaCenter(DEFAULT_SERVICE_AREA))[0]]} zoom={14} minZoom={9} maxZoom={18}
        scrollWheelZoom={false} zoomControl={false}
        className={fill ? "h-full w-full bg-slate-100" : "h-[390px] w-full bg-slate-100 sm:h-[520px] lg:h-[570px]"}
        aria-label="Geographic context near Bandar Bukit Raja; not a flood or road safety map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          className="map-tiles-quiet"
        />
        <ZoomControl position={fill ? "bottomright" : "topright"} />
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
            icon={markerIcon(hazard.category, hazard.impact, reviewStates[hazard.id] ?? "unverified", selectedHazardId === hazard.id)}
            eventHandlers={{ click: () => onSelectHazard(hazard.id) }}
            keyboard
            zIndexOffset={selectedHazardId === hazard.id ? 1000 : (reviewStates[hazard.id] ?? "unverified") === "unverified" ? 500 : 0}
            title={`${categoryLabel(hazard.category)}, ${severityOf(hazard.impact).label}, ${reviewStateOf(reviewStates[hazard.id] ?? "unverified").label}. Fictional report; select for details.`}>
            <Tooltip direction="top" offset={[0, -36]}>{categoryLabel(hazard.category)}, {severityOf(hazard.impact).label.toLowerCase()}</Tooltip>
            {popups ? <Popup maxWidth={280} minWidth={200} autoPan>
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
            </Popup> : null}
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
