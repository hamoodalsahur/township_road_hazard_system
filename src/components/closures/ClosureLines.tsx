"use client";

import { useMemo } from "react";
import { Layer, Marker, Source } from "@vis.gl/react-maplibre";
import { CLOSURE_COLOR, lineMiddle, untilLabel, type PublicClosure } from "@/lib/road-closures";

/**
 * Closed roads on a MapLibre map (roadmap 5.1): red with a white casing and a white dashed centre,
 * so they read as "closed" without relying on colour alone, plus a "Closed until 23:40" label.
 */
export default function ClosureLines({ closures, selectedId = null, onSelect, labels = true }: {
  closures: readonly PublicClosure[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  labels?: boolean;
}) {
  const data = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: closures.flatMap(c => c.roads.filter(r => r.coordinates.length >= 2).map(r => ({
      type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: r.coordinates },
      properties: { closure: c.id, kind: c.kind, selected: c.id === selectedId },
    }))),
  }), [closures, selectedId]);
  return <>
    <Source id="closures" type="geojson" data={data}>
      <Layer id="closures-casing" type="line" layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": "#FFFFFF", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 6, 17, ["case", ["get", "selected"], 16, 13]] }} />
      <Layer id="closures-line" type="line" layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": CLOSURE_COLOR, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3.5, 17, ["case", ["get", "selected"], 10, 8]] }} />
      <Layer id="closures-dash" type="line" paint={{ "line-color": "#FFFFFF", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 17, 2.5], "line-dasharray": [2, 2.5],
        "line-opacity": ["case", ["==", ["get", "kind"], "one_lane"], 0, 1] }} />
    </Source>
    {labels ? closures.map(c => {
      const middle = lineMiddle(c.roads[0]?.coordinates ?? []);
      if (!middle) return null;
      const text = `${c.kind === "one_lane" ? "One lane" : "Closed"} ${untilLabel(c.endsAt)}`;
      return <Marker key={c.id} longitude={middle[0]} latitude={middle[1]} anchor="bottom" offset={[0, -10]} style={{ zIndex: 5 }}>
        {onSelect
          ? <button type="button" onClick={event => { event.stopPropagation(); onSelect(c.id); }} aria-label={`${c.title}: ${text}`}
              className="whitespace-nowrap rounded-lg px-2 py-0.5 text-caption font-semibold text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,.45)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1F5A94]"
              style={{ background: CLOSURE_COLOR }}>{text}</button>
          : <span className="pointer-events-none whitespace-nowrap rounded-lg px-2 py-0.5 text-caption font-semibold text-white" style={{ background: CLOSURE_COLOR }}>{text}</span>}
      </Marker>;
    }) : null}
  </>;
}

/** Small "closed road" sample used in legends and chips. */
export function ClosureSwatch() {
  return <span aria-hidden="true" className="inline-block h-[5px] w-4 rounded-full" style={{ background: CLOSURE_COLOR, boxShadow: `0 0 0 1.5px #fff, 0 0 0 2.5px ${CLOSURE_COLOR}` }} />;
}

/** "Closed to cars" chip in the severity style. */
export function ClosureChip({ label }: { label: string }) {
  return <span className="inline-flex h-[26px] items-center gap-2 whitespace-nowrap rounded-full bg-[#FCEBE8] px-2.5 text-small font-semibold text-[#8F1C13]"><ClosureSwatch />{label}</span>;
}
