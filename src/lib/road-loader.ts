"use client";
import { validRoadCollection, type RoadFeature } from "./bbr-roads";

// The local road file is loaded once per visit and shared by every map drawing.
// On GitHub the file is an empty stub; the full file lives only on the owner's PC.
let roadsPromise: Promise<RoadFeature[]> | null = null;
export function loadRoads(): Promise<RoadFeature[]> {
  roadsPromise ??= fetch("/data/bbr-roads.geojson")
    .then(response => (response.ok ? response.json() : null))
    .then((data: unknown) => (validRoadCollection(data) ? data.features : []))
    .catch(() => []);
  return roadsPromise;
}
