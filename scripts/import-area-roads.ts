/**
 * Download road lines for your own service area from OpenStreetMap (Overpass).
 *
 *   npm run geo:import-area                 uses SERVICE_AREA from .env (for example "local")
 *   npm run geo:import-area -- --replace    replace an existing file (the old one is copied to backup/ first)
 *
 * Writes public/data/roads/<area>.geojson, which is gitignored. Never touches public/data/bbr-roads.geojson.
 * The roads are unverified OpenStreetMap data: not proof of access, safety or flooding.
 */
import { constants } from "node:fs";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validRoadCollection, type RoadCollection, type RoadFeature } from "../src/lib/bbr-roads";
import { convertOsmWay, type OsmWay } from "../src/lib/bbr-osm-import";
import { areaBounds, roadsFileFor } from "../src/lib/service-area";
import { loadServiceAreaFrom, SERVICE_AREA_DIR } from "../src/lib/service-area-server";
import { AREA_MARGIN, importAreaProblem, overpassQueryFor, roadsTouchingArea } from "../src/lib/area-road-import";

// The main Overpass server first, then two public mirrors if it is busy or unreachable.
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const exists = (file: string) => access(file, constants.F_OK).then(() => true, () => false);

async function main() {
  try { process.loadEnvFile(".env"); } catch { /* no .env: rely on the environment */ }
  const replace = process.argv.includes("--replace");
  const loaded = loadServiceAreaFrom(SERVICE_AREA_DIR, process.env.SERVICE_AREA);
  const problem = importAreaProblem(loaded.area.id, loaded.fallbackReason);
  if (problem) throw Error(problem);
  const area = loaded.area;

  const destination = path.resolve("public", "data", roadsFileFor(area.id));
  if (await exists(destination)) {
    if (!replace) throw Error(`${path.relative(process.cwd(), destination)} already exists. Run with --replace to download it again (the old file is kept in backup/).`);
    await mkdir(path.resolve("backup"), { recursive: true });
    const kept = path.resolve("backup", `roads-${area.id}-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.geojson`);
    await copyFile(destination, kept, constants.COPYFILE_EXCL);
    console.log(`Kept the previous file: ${path.relative(process.cwd(), kept)}`);
  }

  console.log(`Downloading roads for ${area.name} from OpenStreetMap…`);
  let data: { elements?: OsmWay[] } | null = null;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "LaluanLocalPrototype/0.3 (academic project, local use)" },
        body: new URLSearchParams({ data: overpassQueryFor(area) }),
        signal: controller.signal,
      });
      if (response.ok) { data = await response.json() as { elements?: OsmWay[] }; break; }
      console.log(`  ${new URL(endpoint).host} answered ${response.status}, trying the next server…`);
    } catch {
      console.log(`  ${new URL(endpoint).host} did not answer, trying the next server…`);
    } finally { clearTimeout(timer); }
  }
  if (!data) throw Error("No OpenStreetMap server answered. Check your internet connection, wait a few minutes and try again. Nothing was written.");
  if (!Array.isArray(data.elements)) throw Error("Unexpected answer from OpenStreetMap. Nothing was written.");

  const b = areaBounds(area);
  const bounds = { south: b.south, west: b.west, north: b.north, east: b.east };
  const converted = data.elements.map(element => convertOsmWay(element, bounds, AREA_MARGIN * 5)).filter((road): road is RoadFeature => road !== null);
  const features = roadsTouchingArea(converted, area);
  if (features.length === 0) throw Error("No roads were found inside the area. Check the area file. Nothing was written.");
  const collection: RoadCollection = { type: "FeatureCollection", features };
  if (!validRoadCollection(collection)) throw Error("The downloaded roads did not pass validation. Nothing was written.");

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(collection) + "\n", "utf8");
  const named = features.filter(road => road.properties.name !== "Unnamed mapped road").length;
  console.log(`Saved ${features.length} road lines (${named} named) to ${path.relative(process.cwd(), destination)}.`);
  console.log("Restart npm run dev if it is running. Unverified OpenStreetMap data, not proof of access or safety.");
}

main().catch(error => { console.error("Stopped: " + (error instanceof Error ? error.message : String(error))); process.exitCode = 1; });
