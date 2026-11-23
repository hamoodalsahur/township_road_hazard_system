"use client";

import { useCallback, useEffect, useState } from "react";
import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import BaseMap from "@/components/maps/BaseMap";
import HazardPins from "@/components/maps/HazardPins";
import ClosureLines from "@/components/closures/ClosureLines";
import RouteLines from "@/components/maps/RouteLines";
import type { LonLat, WayHomeAnswer } from "@/lib/routing";
import { lineMiddle, type PublicClosure } from "@/lib/road-closures";
import { areaOutline, type PinPoint } from "@/lib/map-platform";
import { residentStateLabel } from "@/lib/resident-reports";
import type { ServiceAreaResponse } from "@/lib/service-area";

export type ResidentMapReport = PinPoint;

/** Pans to a selected report when it is off screen, without changing the zoom. */
function FollowSelection({ report }: { report: ResidentMapReport | null }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map || !report) return;
    const b = map.getBounds();
    const [w, e] = [b.getWest(), b.getEast()], [s, n] = [b.getSouth(), b.getNorth()];
    const mx = (e - w) * 0.15, my = (n - s) * 0.15;
    if (report.longitude < w + mx || report.longitude > e - mx || report.latitude < s + my || report.latitude > n - my) {
      map.easeTo({ center: [report.longitude, report.latitude], duration: 400 });
    }
  }, [map, report?.id]);
  return null;
}

/** Shows a picked closure. */
function FollowClosure({ closure }: { closure: PublicClosure | null }) {
  const { current: map } = useMap();
  useEffect(() => {
    const middle = closure ? lineMiddle(closure.roads[0]?.coordinates ?? []) : null;
    if (map && middle) map.easeTo({ center: middle, zoom: Math.max(map.getZoom(), 16), duration: 500 });
  }, [map, closure?.id]);
  return null;
}

/** Moves the map when the resident asks for their location. */
function FlyTo({ target }: { target: { lonLat: [number, number]; key: number } | null }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.flyTo({ center: target.lonLat, zoom: Math.max(map.getZoom(), 17), duration: 800 });
  }, [map, target?.key]);
  return null;
}

/**
 * Resident map (roadmap 4.3 on the 3.1 platform). Positron already shows the roads, so our own road
 * lines are not drawn here (owner's choice, 23 Nov 2026); operators can still inspect them on Maps.
 */
export default function ResidentMap({ area, reports, selectedId = null, onSelect, picking = false, onCentre, flyTo = null, label, sheet = false, onVisibleChange, closures = [], selectedClosureId = null, onSelectClosure, wayHome = null }: {
  area: ServiceAreaResponse;
  reports: readonly ResidentMapReport[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Report step 2: pins are faded and not clickable; the parent draws the fixed centre pin. */
  picking?: boolean;
  onCentre?: (lonLat: [number, number]) => void;
  flyTo?: { lonLat: [number, number]; key: number } | null;
  label: string;
  /** On phones the map page's bottom sheet covers the lower part of the map. */
  sheet?: boolean;
  onVisibleChange?: (visible: ResidentMapReport[]) => void;
  /** Road closures active now (roadmap 5.1). */
  closures?: readonly PublicClosure[];
  selectedClosureId?: string | null;
  onSelectClosure?: (id: string) => void;
  /** Way home (roadmap 6.4): the answer, home and start to draw. */
  wayHome?: { answer: WayHomeAnswer | null; home: LonLat | null; from: LonLat | null } | null;
}) {
  const [covered, setCovered] = useState(0);
  useEffect(() => { setCovered(sheet && window.innerWidth < 1024 ? Math.min(window.innerHeight * 0.4, 320) : 0); }, [sheet]);
  const b = area.bounds;
  const report = useCallback((map: { getCenter: () => { lng: number; lat: number } }) => { const c = map.getCenter(); onCentre?.([c.lng, c.lat]); }, [onCentre]);
  return <BaseMap fit={[b.west, b.south, b.east, b.north]} fitKey={`${area.area.id}:${covered}`} label={label}
    padding={{ top: 64, bottom: covered + 24 }} onReady={picking ? report : undefined} onMoveEnd={picking ? report : undefined}
    controls="bottom-right">
    <Source id="area" type="geojson" data={areaOutline(area.area)}>
      <Layer id="area-line" type="line" paint={{ "line-color": "#0E1720", "line-width": 1.5, "line-opacity": 0.55, "line-dasharray": [3, 3] }} />
    </Source>
    {wayHome && !picking ? <RouteLines answer={wayHome.answer} home={wayHome.home} from={wayHome.from} padding={covered ? { top: 200, bottom: covered + 40 } : undefined} /> : null}
    <ClosureLines closures={closures} selectedId={selectedClosureId} onSelect={picking ? undefined : onSelectClosure} labels={!picking} />
    <HazardPins points={reports} selectedId={selectedId} onSelect={onSelect} interactive={!picking} faded={picking}
      describe={point => residentStateLabel(point.reviewState)} onVisibleChange={onVisibleChange} />
    {picking ? null : <FollowSelection report={reports.find(r => r.id === selectedId) ?? null} />}
    {picking ? null : <FollowClosure closure={closures.find(c => c.id === selectedClosureId) ?? null} />}
    <FlyTo target={flyTo} />
  </BaseMap>;
}
