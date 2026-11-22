"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Polygon, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import HazardMarker from "@/components/hazards/HazardMarker";
import { categoryLabel, severityOf } from "@/lib/hazard-presentation";
import { residentStateLabel } from "@/lib/resident-reports";
import { roadCategory } from "@/lib/bbr-road-display";
import type { RoadFeature } from "@/lib/bbr-roads";
import type { ServiceAreaResponse } from "@/lib/service-area";

export type ResidentMapReport = { id: string; category: string; impact: string; reviewState: string; longitude: number; latitude: number };

// Quiet road lines: the basemap already shows roads, these only keep the map readable when tiles are slow.
const ROAD_WEIGHT = { major: 3, local: 2, service: 1.5, other: 1.2 } as const;

const icons = new Map<string, ReturnType<typeof divIcon>>();
function pinIcon(report: ResidentMapReport, selected: boolean) {
  const key = [report.category, report.impact, report.reviewState, selected].join("|");
  let icon = icons.get(key);
  if (!icon) {
    const size = selected ? 48 : 40;
    const html = renderToStaticMarkup(<HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} selected={selected} size={size} decorative />);
    icon = divIcon({ className: "hazard-map-pin", html, iconSize: [46 * size / 42, 52 * size / 42], iconAnchor: [23 * size / 42, 44 * size / 42] });
    icons.set(key, icon);
  }
  return icon;
}

/** Fits the area once, when it is known. On phones the bottom sheet covers part of the map, so that part is left out. */
function FitArea({ area, sheet }: { area: ServiceAreaResponse; sheet: boolean }) {
  const map = useMap();
  useEffect(() => {
    const b = area.bounds;
    const height = map.getSize().y;
    const covered = sheet && window.innerWidth < 1024 ? Math.min(height * 0.44, 340) : 0;
    map.fitBounds([[b.south, b.west], [b.north, b.east]], { paddingTopLeft: [16, 56], paddingBottomRight: [16, covered + 16], maxZoom: 17, animate: false });
  }, [map, area.area.id, sheet]);
  return null;
}

/** Pans to a selected report so it is never hidden off screen. */
function FollowSelection({ report }: { report: ResidentMapReport | null }) {
  const map = useMap();
  useEffect(() => {
    if (!report) return;
    const point: [number, number] = [report.latitude, report.longitude];
    if (!map.getBounds().pad(-0.15).contains(point)) map.panTo(point);
  }, [map, report?.id]);
  return null;
}

/** Picking mode: the pin stays in the middle and the map moves under it. Reports the centre after every move. */
function CentreWatcher({ onCentre }: { onCentre: (lonLat: [number, number]) => void }) {
  const map = useMap();
  useEffect(() => { const c = map.getCenter(); onCentre([c.lng, c.lat]); }, [map]);
  useMapEvents({ moveend() { const c = map.getCenter(); onCentre([c.lng, c.lat]); } });
  return null;
}

/** Moves the map when the resident asks for their location (or returns to an earlier pin). */
function FlyTo({ target }: { target: { lonLat: [number, number]; key: number } | null }) {
  const map = useMap();
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!target || target.key === last.current) return;
    last.current = target.key;
    map.setView([target.lonLat[1], target.lonLat[0]], Math.max(map.getZoom(), 17), { animate: true });
  }, [map, target]);
  return null;
}

export default function ResidentLeafletMap({ area, roads, reports, selectedId = null, onSelect, picking = false, onCentre, flyTo = null, label, sheet = false }: {
  area: ServiceAreaResponse;
  roads: readonly RoadFeature[];
  reports: readonly ResidentMapReport[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Report step 2: reports are faded and not clickable; the centre pin is drawn by the parent. */
  picking?: boolean;
  onCentre?: (lonLat: [number, number]) => void;
  flyTo?: { lonLat: [number, number]; key: number } | null;
  label: string;
  /** The map page's bottom sheet covers the lower part of the map on phones. */
  sheet?: boolean;
}) {
  const selected = reports.find(r => r.id === selectedId) ?? null;
  return (
    <MapContainer center={[area.center[1], area.center[0]]} zoom={15} minZoom={11} maxZoom={19} zoomControl={false} scrollWheelZoom zoomSnap={0.25}
      className="!absolute inset-0 isolate bg-slate-100" aria-label={label}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} className="map-tiles-quiet" />
      <ZoomControl position="bottomright" />
      <FitArea area={area} sheet={sheet} />
      {/* Where reports are accepted: a faint dashed line, never a road status. */}
      <Polygon positions={area.area.rings.map(ring => ring.map(([lon, lat]) => [lat, lon] as [number, number]))} interactive={false}
        pathOptions={{ color: "#0E1720", weight: 1.5, opacity: 0.5, dashArray: "6 6", fill: false }} />
      {roads.map(road => (
        <Polyline key={road.properties.id} interactive={false}
          positions={road.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number])}
          pathOptions={{ color: "#46525E", weight: ROAD_WEIGHT[roadCategory(road.properties.highway)], opacity: 0.45 }} />
      ))}
      {reports.map(report => (
        <Marker key={report.id} position={[report.latitude, report.longitude]} icon={pinIcon(report, !picking && report.id === selectedId)}
          interactive={!picking} keyboard={!picking} opacity={picking ? 0.45 : 1}
          zIndexOffset={report.id === selectedId ? 1000 : report.reviewState === "unverified" ? 500 : 0}
          title={`${categoryLabel(report.category)}, ${severityOf(report.impact).label}, ${residentStateLabel(report.reviewState)}`}
          eventHandlers={picking ? {} : { click: () => onSelect?.(report.id) }} />
      ))}
      {picking ? null : <FollowSelection report={selected} />}
      {picking && onCentre ? <CentreWatcher onCentre={onCentre} /> : null}
      <FlyTo target={flyTo} />
    </MapContainer>
  );
}
