/**
 * One-way copy of the old SQLite demo database into Postgres (roadmap step 2.2).
 * Pure rules for scripts/copy-sqlite-to-postgres.ts, so they can be tested without a database.
 * The copy never writes to the SQLite file: it reads a snapshot copy, and only ever inserts into an
 * empty Postgres database.
 */
import { createHash } from "node:crypto";

/** Prisma model names, parents before children so every foreign key already exists when a row arrives. */
export const COPY_ORDER = [
  "dataSource", "townshipZone", "graphNode", "roadSegment", "roadStatusEvent", "scenarioRun",
  "floodReport", "auditEntry", "hazardReport", "hazardEvidence", "demoIncident", "incidentReportLink",
] as const;
export type CopyModel = (typeof COPY_ORDER)[number];
export type Counts = Record<CopyModel, number>;

/** Rows per insert. Photos are stored as text, so they go in smaller batches. */
export const BATCH_SIZE: Partial<Record<CopyModel, number>> = { hazardEvidence: 25 };
export const DEFAULT_BATCH = 500;

/** Tables in the target that already hold rows. The copy refuses to run unless this is empty. */
export function nonEmptyTables(target: Counts): CopyModel[] {
  return COPY_ORDER.filter(model => target[model] > 0);
}

/** Tables whose counts differ between source and target after copying. */
export function countMismatches(source: Counts, target: Counts): { model: CopyModel; source: number; target: number }[] {
  return COPY_ORDER.filter(model => source[model] !== target[model]).map(model => ({ model, source: source[model], target: target[model] }));
}

/** A fingerprint of a table's ids, so "same count, different rows" is also caught. */
export function idFingerprint(ids: readonly string[]): string {
  return createHash("sha256").update([...ids].sort().join("\n")).digest("hex").slice(0, 16);
}

/** Split rows into insert batches. */
export function batches<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += Math.max(1, size)) out.push(rows.slice(i, i + Math.max(1, size)));
  return out;
}

/** The target must be Postgres; refusing a file: URL stops the script from ever writing into a SQLite file. */
export function targetProblem(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return "DATABASE_URL is not set. Add the Postgres address to .env first.";
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) return "DATABASE_URL must point to Postgres (postgresql://…), not to a SQLite file.";
  return null;
}

/** Folder name for the snapshot, safe on Windows: sqlite-snapshot-2026-11-22T14-05-09 */
export function snapshotFolderName(at: Date): string {
  return "sqlite-snapshot-" + at.toISOString().slice(0, 19).replaceAll(":", "-");
}

/** Plain-language table names for the report. */
export const TABLE_LABELS: Record<CopyModel, string> = {
  dataSource: "Data sources", townshipZone: "Schematic zones", graphNode: "Schematic road nodes", roadSegment: "Schematic road segments",
  roadStatusEvent: "Road status events", scenarioRun: "Scenario runs", floodReport: "Old flood reports", auditEntry: "Audit entries",
  hazardReport: "Hazard reports", hazardEvidence: "Photos", demoIncident: "Incident groups", incidentReportLink: "Report-to-group links",
};
