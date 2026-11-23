/** OpenStreetMap road geometry for geographic *context*, never flood routing. */
export type RoadFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: {
    id: string;
    name: string;
    highway: string;
    sourceUrl: string;
    verification: "osm_unverified";
    /** Original OSM node IDs in geometry-coordinate order, when preserved by the importer. */
    osmNodeIds?: number[];
    oneway?: string;
    bridge?: string;
    tunnel?: string;
    layer?: string;
    access?: string;
    motor_vehicle?: string;
    junction?: string;
  };
};
/** Most road lines one area file may hold. A 10 km square of town roads is a few thousand (raised from 2,000 on 23 Nov 2026). */
export const MAX_ROAD_LINES = 15_000;
export type RoadCollection = { type: "FeatureCollection"; features: RoadFeature[] };

export function validCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) && value[0] >= -180 && value[0] <= 180 &&
    typeof value[1] === "number" && Number.isFinite(value[1]) && value[1] >= -90 && value[1] <= 90;
}
export function validRoadCollection(value: unknown): value is RoadCollection {
  if (!value || typeof value !== "object") return false;
  const collection = value as { type?: unknown; features?: unknown };
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features) || collection.features.length > MAX_ROAD_LINES) return false;
  return collection.features.every(feature => {
    if (!feature || typeof feature !== "object") return false;
    const record = feature as Partial<RoadFeature>;
    const props = record.properties;
    return record.type === "Feature" && record.geometry?.type === "LineString" &&
      Array.isArray(record.geometry.coordinates) && record.geometry.coordinates.length >= 2 &&
      record.geometry.coordinates.length <= 5000 &&
      record.geometry.coordinates.every(validCoordinate) &&
      !!props && typeof props.id === "string" && /^osm-way-\d+$/.test(props.id) &&
      typeof props.name === "string" && typeof props.highway === "string" &&
      props.verification === "osm_unverified" &&
      (props.osmNodeIds === undefined || (
        Array.isArray(props.osmNodeIds) &&
        props.osmNodeIds.length === record.geometry.coordinates.length &&
        props.osmNodeIds.every(id => Number.isSafeInteger(id) && id > 0)
      )) &&
      ["oneway", "bridge", "tunnel", "layer", "access", "motor_vehicle", "junction"].every(tag => {
        const value = (props as unknown as Record<string, unknown>)[tag];
        return value === undefined || (typeof value === "string" && value.length <= 120);
      }) &&
      typeof props.sourceUrl === "string" && /^https:\/\/www\.openstreetmap\.org\/way\/\d+$/.test(props.sourceUrl);
  });
}
