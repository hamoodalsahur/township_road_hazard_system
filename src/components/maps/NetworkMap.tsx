"use client";

import { CRS, type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import { CircleMarker, MapContainer, Polygon, Polyline, Tooltip, ZoomControl } from "react-leaflet";
import type { MapNode, MapRoad, MapZone } from "@/lib/map-types";

type Props = {
  zones: MapZone[];
  nodes: MapNode[];
  roads: MapRoad[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const bounds: LatLngBoundsExpression = [[-6, -6], [106, 106]];
const toPosition = (x: number, y: number): LatLngExpression => [y, x];

const statusColors: Record<string,string> = {
  unknown: "#64748b",
  at_risk: "#d97706",
  reported_flooding_unverified: "#f97316",
  confirmed_closed: "#dc2626",
  no_known_disruption: "#059669",
};

export default function NetworkMap({ zones, nodes, roads, selectedId, onSelect }: Props) {
  const nodeLookup = new Map(nodes.map(node => [node.id, node]));
  return (
    <MapContainer
      crs={CRS.Simple}
      center={[50, 50]}
      zoom={2}
      minZoom={0}
      maxZoom={5}
      bounds={bounds}
      maxBounds={[[-18, -18], [118, 118]]}
      maxBoundsViscosity={1}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="h-[370px] w-full rounded-lg bg-slate-100 sm:h-[450px]"
      aria-label="Schematic interactive township network, not a geographic map"
    >
      <ZoomControl position="topright" />
      {zones.map(zone => (
        <Polygon
          key={zone.id}
          positions={zone.boundary.map(([x, y]) => toPosition(x, y))}
          pathOptions={{
            color: selectedId === zone.id ? "#17573F" : "#7caeb8",
            weight: selectedId === zone.id ? 3 : 1.5,
            fillColor: "#d6edf0",
            fillOpacity: selectedId === zone.id ? 0.8 : 0.48,
          }}
          eventHandlers={{ click: () => onSelect(zone.id) }}
        >
          <Tooltip sticky>{zone.name} · risk unknown</Tooltip>
        </Polygon>
      ))}
      {roads.map(road => {
        const start = nodeLookup.get(road.fromNodeId);
        const end = nodeLookup.get(road.toNodeId);
        if (!start || !end) return null;
        const selected = selectedId === road.id;
        return (
          <Polyline
            key={road.id}
            positions={[toPosition(start.x, start.y), toPosition(end.x, end.y)]}
            pathOptions={{
              color: selected ? "#1d4ed8" : (statusColors[road.status] ?? "#64748b"),
              weight: selected ? 8 : road.corridorType === "ingress_egress_gateway" ? 6 : 4,
              dashArray: road.corridorType === "park_trail" ? "5 7" : undefined,
              opacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelect(road.id) }}
          >
            <Tooltip sticky>{road.label} · {road.status.replaceAll("_", " ")}</Tooltip>
          </Polyline>
        );
      })}
      {nodes.map(node => (
        <CircleMarker
          key={node.id}
          center={toPosition(node.x, node.y)}
          radius={node.isGateway ? 6 : 4}
          pathOptions={{ color: "#fff", weight: 2, fillColor: node.isGateway ? "#17573F" : "#176891", fillOpacity: 1 }}
        >
          <Tooltip>{node.label}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
