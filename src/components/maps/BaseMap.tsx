"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, type ReactNode } from "react";
import { Map, NavigationControl, type MapLayerMouseEvent, type MapRef } from "@vis.gl/react-maplibre";
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, MAP_STYLE_URL, type Bounds4 } from "@/lib/map-platform";

export type FitPadding = { top: number; bottom: number; left: number; right: number };

/**
 * The one base map for the website (roadmap 3.1): MapLibre with OpenFreeMap's quiet "Positron" style.
 * It fits `fit` when first drawn and again whenever `fitKey` changes (for example once the real service
 * area arrives). Children are sources, layers and markers.
 */
export default function BaseMap({ fit, fitKey, padding, label, children, onClick, onMouseMove, onMouseLeave, onMoveEnd, onReady, interactiveLayerIds, cursor, controls = "bottom-right" }: {
  fit: Bounds4;
  fitKey: string;
  padding?: Partial<FitPadding>;
  label: string;
  children?: ReactNode;
  onClick?: (event: MapLayerMouseEvent) => void;
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  onMouseLeave?: (event: MapLayerMouseEvent) => void;
  onMoveEnd?: (map: MapRef) => void;
  onReady?: (map: MapRef) => void;
  interactiveLayerIds?: string[];
  cursor?: string;
  controls?: "bottom-right" | "top-right" | "none";
}) {
  const ref = useRef<MapRef>(null);
  const pad = { top: 24, bottom: 24, left: 24, right: 24, ...padding };
  // The first view comes from initialViewState; later changes of fitKey refit once the map has loaded.
  const fitted = useRef(fitKey);
  const loaded = useRef(false);
  const latest = useRef({ fit, pad, fitKey });
  latest.current = { fit, pad, fitKey };
  const refit = () => {
    const map = ref.current;
    const { fit: f, pad: p, fitKey: key } = latest.current;
    if (!map || !loaded.current || fitted.current === key) return;
    fitted.current = key;
    map.fitBounds([[f[0], f[1]], [f[2], f[3]]], { padding: p, maxZoom: 17, duration: 0 });
  };
  useEffect(refit, [fitKey]);

  return <div role="region" aria-label={label} className="absolute inset-0 isolate bg-[#F2F3F0]">
    <Map ref={ref} mapStyle={MAP_STYLE_URL}
      initialViewState={{ bounds: [[fit[0], fit[1]], [fit[2], fit[3]]], fitBoundsOptions: { padding: pad, maxZoom: 17 } }}
      minZoom={MAP_MIN_ZOOM} maxZoom={MAP_MAX_ZOOM} dragRotate={false} pitchWithRotate={false} touchPitch={false}
      style={{ position: "absolute", inset: 0 }} cursor={cursor} interactiveLayerIds={interactiveLayerIds}
      onLoad={() => { loaded.current = true; refit(); if (ref.current) onReady?.(ref.current); }}
      onClick={onClick} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      onMoveEnd={() => { if (ref.current) onMoveEnd?.(ref.current); }}>
      {controls === "none" ? null : <NavigationControl position={controls} showCompass={false} />}
      {children}
    </Map>
  </div>;
}
