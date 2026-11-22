/**
 * Copy the old SQLite demo database (prisma/dev.db) into the new Postgres database. Roadmap step 2.2.
 *
 *   npm run db:copy-from-sqlite -- --dry-run     show what would be copied, change nothing
 *   npm run db:copy-from-sqlite                  copy (only into an empty Postgres database)
 *   add  --from path/to/other.db                 to read a different SQLite file
 *
 * Safety:
 * - The SQLite file is never opened for writing. It (and its -wal/-shm side files) is first COPIED into
 *   backup/sqlite-snapshot-<time>/, and only that copy is read.
 * - It refuses to run unless every Postgres table is empty, so nothing is ever overwritten or mixed.
 * - Everything is inserted in one transaction: all rows or none.
 * - Afterwards it compares row counts and id fingerprints table by table.
 */
import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaClient as LegacyClient } from "../node_modules/.prisma/sqlite-legacy-client";
import {
  BATCH_SIZE, COPY_ORDER, DEFAULT_BATCH, TABLE_LABELS, batches, countMismatches, idFingerprint, nonEmptyTables, snapshotFolderName,
  targetProblem, type CopyModel, type Counts,
} from "../src/lib/db-copy";

type Delegate = { count(): Promise<number>; findMany(args?: unknown): Promise<{ id: string }[]>; createMany(args: { data: unknown[] }): Promise<{ count: number }> };
const table = (client: unknown, model: CopyModel) => (client as Record<CopyModel, Delegate>)[model];

async function countAll(client: unknown): Promise<Counts> {
  const counts = {} as Counts;
  for (const model of COPY_ORDER) counts[model] = await table(client, model).count();
  return counts;
}
async function fingerprints(client: unknown): Promise<Record<CopyModel, string>> {
  const out = {} as Record<CopyModel, string>;
  for (const model of COPY_ORDER) out[model] = idFingerprint((await table(client, model).findMany({ select: { id: true } })).map(row => row.id));
  return out;
}
function printCounts(title: string, counts: Counts) {
  console.log(`\n${title}`);
  for (const model of COPY_ORDER) console.log(`  ${TABLE_LABELS[model].padEnd(24)} ${String(counts[model]).padStart(6)}`);
}
const exists = (file: string) => access(file, constants.F_OK).then(() => true, () => false);

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fromIndex = args.indexOf("--from");
  const source = path.resolve(fromIndex >= 0 && args[fromIndex + 1] ? args[fromIndex + 1] : "prisma/dev.db");

  const problem = targetProblem(process.env.DATABASE_URL);
  if (problem) throw Error(problem);
  if (!(await exists(source))) throw Error(`SQLite file not found: ${source}`);

  // 1. Snapshot: copy the SQLite file and its side files. The original is only read by the copy.
  const snapshotDir = path.resolve("backup", snapshotFolderName(new Date()));
  await mkdir(snapshotDir, { recursive: true });
  const snapshot = path.join(snapshotDir, path.basename(source));
  for (const suffix of ["", "-wal", "-shm"]) {
    if (await exists(source + suffix)) await copyFile(source + suffix, snapshot + suffix, constants.COPYFILE_EXCL);
  }
  console.log(`Read-only snapshot: ${snapshotDir}`);
  console.log("Your original SQLite file was only copied, never opened.");

  const legacy = new LegacyClient({ datasourceUrl: "file:" + snapshot.replaceAll("\\", "/") });
  const target = new PrismaClient();
  try {
    const sourceCounts = await countAll(legacy);
    printCounts("In the SQLite snapshot:", sourceCounts);
    const targetCounts = await countAll(target);
    const busy = nonEmptyTables(targetCounts);
    if (busy.length) {
      printCounts("Already in Postgres:", targetCounts);
      throw Error(`Postgres is not empty (${busy.map(m => TABLE_LABELS[m]).join(", ")}). Nothing was copied. ` +
        "The copy only runs into a fresh database, so existing data is never overwritten or mixed.");
    }
    console.log("\nPostgres is empty, as required.");
    if (dryRun) { console.log("\nDry run: nothing was copied. Run again without --dry-run to copy."); return; }

    // 2. Copy everything in one transaction, parents first.
    const total = COPY_ORDER.reduce((sum, model) => sum + sourceCounts[model], 0);
    await target.$transaction(async tx => {
      for (const model of COPY_ORDER) {
        if (!sourceCounts[model]) continue;
        const rows = await table(legacy, model).findMany();
        for (const part of batches(rows, BATCH_SIZE[model] ?? DEFAULT_BATCH)) await table(tx, model).createMany({ data: part });
        console.log(`  copied ${TABLE_LABELS[model]}: ${rows.length}`);
      }
    }, { timeout: 300_000, maxWait: 30_000 });

    // 3. Check: counts and id fingerprints must match table by table.
    const after = await countAll(target);
    const mismatches = countMismatches(sourceCounts, after);
    const [a, b] = await Promise.all([fingerprints(legacy), fingerprints(target)]);
    const differentIds = COPY_ORDER.filter(model => a[model] !== b[model]);
    if (mismatches.length || differentIds.length) {
      throw Error("Copied, but the check found differences: " + [...mismatches.map(m => `${TABLE_LABELS[m.model]} ${m.source} vs ${m.target}`), ...differentIds.map(m => `${TABLE_LABELS[m]} ids differ`)].join("; "));
    }
    console.log(`\nDone. ${total} rows copied, and every table matches the snapshot (counts and ids).`);
  } finally {
    await Promise.all([legacy.$disconnect(), target.$disconnect()]);
  }
}

main().catch(error => {
  console.error("\nStopped: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
