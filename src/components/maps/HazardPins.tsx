"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, useMap } from "@vis.gl/react-maplibre";
import HazardMarker from "@/components/hazards/HazardMarker";
import { categoryLabel, severityOf } from "@/lib/hazard-presentation";
import { clusterPins, inside, type Bounds4, type PinPoint } from "@/lib/map-platform";

const PIN = 40; // pin height in px at rest; the selected pin is drawn at 48

/**
 * Report pins on a MapLibre map (roadmap 3.2). Pins that would overlap become a numbered bubble in the
 * colour of their most serious report; selecting the bubble zooms in. Pins are real buttons, so they work
 * with the keyboard and screen readers. Only fixed props reach the pin, never report text.
 */
export default function HazardPins({ points, selectedId = null, onSelect, describe, interactive = true, faded = false, onVisibleChange }: {
  points: readonly PinPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Words for a pin's accessible name, e.g. "Being checked". */
  describe: (point: PinPoint) => string;
  interactive?: boolean;
  faded?: boolean;
  /** Called with the reports inside the current view, for a legend that lists only what is on screen. */
  onVisibleChange?: (visible: PinPoint[]) => void;
}) {
  const { current: map } = useMap();
  const [view, setView] = useState<{ bounds: Bounds4; zoom: number } | null>(null);
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      setView({ bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() });
    };
    update();
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map]);

  const items = useMemo(() => (view ? clusterPins(points, view.bounds, view.zoom, selectedId) : []), [points, view, selectedId]);
  // Tell the parent only when the set of reports on screen really changes, so a parent re-render cannot loop.
  const lastVisible = useRef<string | null>(null);
  useEffect(() => {
    if (!view || !onVisibleChange) return;
    const visible = points.filter(point => inside(view.bounds, point));
    const key = visible.map(point => `${point.id}:${point.impact}:${point.reviewState}`).join("|");
    if (key === lastVisible.current) return;
    lastVisible.current = key;
    onVisibleChange(visible);
  }, [points, view, onVisibleChange]);

  return <>{items.map(item => {
    if (item.kind === "cluster") {
      const severity = severityOf(item.impact);
      const size = item.count >= 10 ? 46 : 40;
      return <Marker key={`c${item.id}`} longitude={item.longitude} latitude={item.latitude} anchor="center" style={{ zIndex: 2 }}>
        <button type="button" disabled={!interactive}
          aria-label={`${item.count} reports here${item.waiting ? `, ${item.waiting} still being checked` : ""}. Zoom in to see them.`}
          onClick={event => { event.stopPropagation(); map?.easeTo({ center: [item.longitude, item.latitude], zoom: item.expansionZoom, duration: 400 }); }}
          className="flex items-center justify-center rounded-full bg-white font-display text-heading font-semibold text-slate-900 shadow-[0_6px_16px_-8px_rgba(14,23,32,.7)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1F5A94] disabled:cursor-default"
          style={{ width: size, height: size, border: `4px solid ${severity.solid}`, opacity: faded ? 0.45 : 1 }}>
          {item.count}
        </button>
      </Marker>;
    }
    const point = item.point;
    const selected = point.id === selectedId && interactive;
    const size = selected ? 48 : PIN;
    const label = `${categoryLabel(point.category)}, ${severityOf(point.impact).label}, ${describe(point)}`;
    return <Marker key={point.id} longitude={point.longitude} latitude={point.latitude} anchor="top-left"
      offset={[-23 * size / 42, -44 * size / 42]} style={{ zIndex: selected ? 4 : point.reviewState === "unverified" ? 3 : 1 }}>
      {interactive
        ? <button type="button" aria-label={label} aria-pressed={selected} title={label}
            onClick={event => { event.stopPropagation(); onSelect?.(point.id); }}
            className="block rounded-[10px] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1F5A94]">
            <HazardMarker category={point.category} impact={point.impact} reviewState={point.reviewState} selected={selected} size={size} decorative />
          </button>
        : <span aria-hidden="true" className="pointer-events-none block" style={{ opacity: faded ? 0.45 : 1 }}>
            <HazardMarker category={point.category} impact={point.impact} reviewState={point.reviewState} size={size} decorative />
          </span>}
    </Marker>;
  })}</>;
}
