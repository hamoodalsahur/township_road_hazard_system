// Server only: uses the file system. Browsers get the area from GET /api/service-area.
import { readFileSync } from "node:fs";
import path from "node:path";
import { AREA_ID_PATTERN, DEFAULT_SERVICE_AREA, parseServiceArea, type ServiceArea } from "./service-area";

export type LoadedServiceArea = { area: ServiceArea; configuredId: string; fallbackReason: string | null };

export const SERVICE_AREA_DIR = path.join(process.cwd(), "config", "service-areas");

/**
 * Reads the area named by the server-only SERVICE_AREA setting (default "bbr") from
 * config/service-areas/<id>.geojson. Anything unusable falls back to the built-in BBR area,
 * with the reason recorded so System & Audit can show it. Never throws.
 */
export function loadServiceAreaFrom(directory: string, configured: string | undefined): LoadedServiceArea {
  const configuredId = (configured ?? "").trim() || DEFAULT_SERVICE_AREA.id;
  const fallback = (reason: string): LoadedServiceArea => ({ area: DEFAULT_SERVICE_AREA, configuredId, fallbackReason: reason });
  if (!AREA_ID_PATTERN.test(configuredId)) return fallback(`SERVICE_AREA "${configuredId.slice(0, 40)}" is not a valid name (use lowercase letters, numbers or dashes).`);
  let text: string;
  try {
    text = readFileSync(path.join(directory, `${configuredId}.geojson`), "utf8");
  } catch {
    if (configuredId === DEFAULT_SERVICE_AREA.id) return { area: DEFAULT_SERVICE_AREA, configuredId, fallbackReason: null };
    return fallback(`config/service-areas/${configuredId}.geojson was not found.`);
  }
  try {
    return { area: parseServiceArea(JSON.parse(text), configuredId), configuredId, fallbackReason: null };
  } catch (error) {
    return fallback(`config/service-areas/${configuredId}.geojson could not be used: ${error instanceof Error ? error.message : "invalid file"}.`);
  }
}

let cached: LoadedServiceArea | null = null;
/** Read once per server start. Restart the dev server after changing the area file or SERVICE_AREA. */
export function loadServiceArea(): LoadedServiceArea {
  cached ??= loadServiceAreaFrom(SERVICE_AREA_DIR, process.env.SERVICE_AREA);
  return cached;
}
