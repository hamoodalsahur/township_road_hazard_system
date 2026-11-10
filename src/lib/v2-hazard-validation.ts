import { HAZARD_CATEGORIES, type HazardCategory } from "./demo-hazards";
import { DEFAULT_SERVICE_AREA, isInsideServiceArea, type ServiceArea } from "./service-area";

export const IMPACT_OPTIONS = ["unknown","caution","partial_obstruction","suspected_closure"] as const;
export type HazardImpact = (typeof IMPACT_OPTIONS)[number];
export type SubmittedHazard = { category: HazardCategory; description: string; coordinates: [number,number]; impact: HazardImpact };
/** `area` is the active service area (see src/lib/service-area-server.ts); BBR when not given. */
export function validateHazardSubmission(input: unknown, area: ServiceArea = DEFAULT_SERVICE_AREA): SubmittedHazard {
  if (!input || typeof input !== "object") throw new Error("Invalid hazard report");
  const value = input as Record<string,unknown>;
  if (!HAZARD_CATEGORIES.includes(value.category as HazardCategory)) throw new Error("Choose a valid hazard category");
  if (typeof value.description !== "string" || value.description.trim().length < 8 || value.description.length > 400) throw new Error("Description must be 8–400 characters");
  if (!IMPACT_OPTIONS.includes(value.impact as HazardImpact)) throw new Error("Choose a valid suspected impact");
  if (!Array.isArray(value.coordinates) || value.coordinates.length !== 2 ||
    !value.coordinates.every(v => typeof v === "number" && Number.isFinite(v))) throw new Error("Choose a map location");
  const [lon,lat] = value.coordinates;
  if (!isInsideServiceArea(area, lon, lat)) throw new Error(`Select a point inside the service area (${area.name})`);
  return { category: value.category as HazardCategory, description: value.description.trim(), impact: value.impact as HazardImpact, coordinates: [lon,lat] };
}
export function validateHazardReview(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid review");
  const data = input as Record<string,unknown>;
  if (data.decision !== "corroborated" && data.decision !== "rejected") throw new Error("Choose corroborated or rejected");
  if (typeof data.note !== "string" || data.note.trim().length < 8 || data.note.length > 400) throw new Error("Review note must be 8–400 characters");
  if (data.publishPhoto !== undefined && typeof data.publishPhoto !== "boolean") throw new Error("Invalid photo visibility choice");
  return { decision:data.decision as "corroborated"|"rejected", note:data.note.trim(), publishPhoto:data.publishPhoto === true };
}
