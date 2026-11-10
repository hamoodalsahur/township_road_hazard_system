"use client";
import { useEffect, useState } from "react";
import { validRoadCollection, type RoadFeature } from "@/lib/bbr-roads";
import HazardMarker from "./HazardMarker";
import { MINI_MAP_HEIGHT as H, MINI_MAP_WIDTH as W, miniMapPaths } from "@/lib/mini-map";

// The local road file is loaded once per visit and shared by every mini map.
let roadsPromise: Promise<RoadFeature[]> | null = null;
function loadRoads(): Promise<RoadFeature[]> {
  roadsPromise ??= fetch("/data/bbr-roads.geojson")
    .then(response => (response.ok ? response.json() : null))
    .then((data: unknown) => (validRoadCollection(data) ? data.features : []))
    .catch(() => []);
  return roadsPromise;
}

/** Small reference map for one report. Road lines are unverified OpenStreetMap data. */
export default function ReportMiniMap({ longitude, latitude, category, impact, reviewState }: {
  longitude: number; latitude: number; category: string; impact: string; reviewState: string;
}) {
  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadRoads().then(result => { if (live) setRoads(result); });
    return () => { live = false; };
  }, []);
  const paths = roads ? miniMapPaths(roads, longitude, latitude) : [];
  return <figure className="relative h-44 overflow-hidden rounded-2xl bg-[#EEF1EF]" aria-label="Report location on unverified OpenStreetMap road lines">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {paths.map(path => <g key={path.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {path.major ? <path d={path.d} stroke="rgba(27,36,32,.42)" strokeWidth={7} /> : null}
        <path d={path.d} stroke={path.major ? "#F6F7F6" : "rgba(27,36,32,.3)"} strokeWidth={path.major ? 4 : 1.6} />
      </g>)}
    </svg>
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[85%]">
      <HazardMarker category={category} impact={impact} reviewState={reviewState} selected decorative size={44} />
    </div>
    {roads !== null && paths.length === 0
      ? <figcaption className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs text-slate-600">Road lines not loaded</figcaption>
      : null}
    <span className="absolute bottom-2 right-2 rounded-full bg-white px-2.5 py-0.5 font-mono text-xs text-slate-900">
      {latitude.toFixed(5)}, {longitude.toFixed(5)}
    </span>
  </figure>;
}
