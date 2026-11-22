/**
 * Copy an area's road lines from its GeoJSON file into Postgres (roadmap step 2.3).
 *
 *   npm run db:import-roads                    the active area (SERVICE_AREA in .env)
 *   npm run db:import-roads -- --area bbr      another area that has a road file
 *   npm run db:import-roads -- --dry-run       check the file and show what would change; writes nothing
 *
 * The GeoJSON file is only read, never written, moved or replaced (that includes public/data/bbr-roads.geojson).
 * Running it again replaces that area's rows in one transaction, so a failed run leaves the old rows in place.
 * The lines are unverified OpenStreetMap reference: not proof of access, safety, flooding or closures.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { RoadCollection } from "../src/lib/bbr-roads";
import { targetProblem } from "../src/lib/db-copy";
import { AREA_ID_PATTERN, roadsFileFor } from "../src/lib/service-area";
import { loadServiceAreaFrom, SERVICE_AREA_DIR } from "../src/lib/service-area-server";
import { roadImportProblem, roadLineRows } from "../src/lib/road-lines";

const BATCH = 250;

async function main() {
  try { process.loadEnvFile(".env"); } catch { /* no .env: rely on the environment */ }
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const areaIndex = args.indexOf("--area");
  let areaId: string;
  if (areaIndex >= 0) {
    areaId = (args[areaIndex + 1] ?? "").trim();
    if (!AREA_ID_PATTERN.test(areaId)) throw Error("--area needs a name like bbr or local (lowercase letters, numbers or dashes).");
  } else {
    const loaded = loadServiceAreaFrom(SERVICE_AREA_DIR, process.env.SERVICE_AREA);
    if (loaded.fallbackReason) throw Error(`The active area could not be loaded: ${loaded.fallbackReason}`);
    areaId = loaded.area.id;
  }
  const problem = targetProblem(process.env.DATABASE_URL);
  if (problem) throw Error(problem);

  // 1. Read the file. Read only: nothing below writes to it.
  const relative = roadsFileFor(areaId);
  const label = path.join("public", "data", relative);
  let bytes: Buffer;
  try { bytes = await readFile(path.resolve("public", "data", relative)); }
  catch { throw Error(`${label} was not found. Download your area's roads first (npm run geo:import-area).`); }
  let parsed: unknown;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch { throw Error(`${label} is not valid JSON.`); }
  const fileProblem = roadImportProblem(label, parsed, areaId);
  if (fileProblem) throw Error(fileProblem);
  const features = (parsed as RoadCollection).features;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  roadLineRows(areaId, features, "check"); // throws on a repeated way id before touching the database
  console.log(`Read ${label}: ${features.length} road lines (fingerprint ${sha256.slice(0, 12)}…). The file was only read.`);

  const db = new PrismaClient();
  try {
    const before = await db.roadLine.count({ where: { areaId } });
    console.log(`Already in the database for "${areaId}": ${before} lines.`);
    if (dryRun) { console.log("\nDry run: nothing was written. Run again without --dry-run to import."); return; }

    // 2. Replace this area's rows in one transaction.
    await db.$transaction(async tx => {
      await tx.roadLine.deleteMany({ where: { areaId } });
      const run = await tx.roadImport.create({ data: { areaId, sourceFile: relative, sha256, lineCount: features.length } });
      const rows = roadLineRows(areaId, features, run.id);
      for (let i = 0; i < rows.length; i += BATCH) await tx.roadLine.createMany({ data: rows.slice(i, i + BATCH) });
    }, { timeout: 120_000, maxWait: 30_000 });

    // 3. Check: the database now holds exactly the file's lines.
    const after = await db.roadLine.findMany({ where: { areaId }, orderBy: { position: "asc" }, select: { wayId: true } });
    const same = after.length === features.length && after.every((row, i) => row.wayId === features[i].properties.id);
    if (!same) throw Error(`Imported, but the check found ${after.length} lines in the database and ${features.length} in the file.`);
    console.log(`\nDone. ${after.length} road lines for "${areaId}" are in the database, in the same order as the file.`);
    console.log("Reload the app in your browser: the maps now read roads from the database.");
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error("\nStopped: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
