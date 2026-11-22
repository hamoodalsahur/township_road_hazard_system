import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  COPY_ORDER, batches, countMismatches, idFingerprint, nonEmptyTables, snapshotFolderName, targetProblem, type Counts,
} from "../src/lib/db-copy";

// Roadmap step 2.2: Postgres in Docker, and a one-way, read-only copy from the old SQLite file.
const read = (file: string) => readFileSync(file, "utf8");
const schema = read("prisma/schema.prisma");
const legacy = read("prisma/sqlite-legacy/schema.prisma");
const models = (source: string) => source.slice(source.indexOf("model DataSource"));
const zero = () => Object.fromEntries(COPY_ORDER.map(model => [model, 0])) as Counts;

test("the app uses Postgres, and the legacy schema matches it model for model", () => {
  assert.match(schema, /provider = "postgresql"/);
  assert.match(legacy, /provider = "sqlite"/);
  assert.match(legacy, /output\s+= "\.\.\/\.\.\/node_modules\/\.prisma\/sqlite-legacy-client"/);
  assert.equal(models(legacy), models(schema), "the copy reads exactly the tables the app writes");
});

test("there is one committed migration that creates every table", () => {
  const folders = readdirSync("prisma/migrations").filter(name => /^\d{14}_/.test(name));
  assert.deepEqual(folders, ["20261122000000_init"]);
  const sql = read("prisma/migrations/20261122000000_init/migration.sql");
  assert.equal((sql.match(/CREATE TABLE/g) ?? []).length, 12);
  assert.match(read("prisma/migrations/migration_lock.toml"), /provider = "postgresql"/);
});

test("Docker runs Postgres only for this PC, with the password from .env", () => {
  const compose = read("docker-compose.yml");
  assert.match(compose, /image: postgres:16\n/);
  assert.match(compose, /"127\.0\.0\.1:5432:5432"/, "not reachable from the local network");
  assert.match(compose, /POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD:\?/, "refuses to start without a password");
  assert.match(compose, /laluan-pgdata:\/var\/lib\/postgresql\/data/);
  assert.doesNotMatch(compose, /postgis\/postgis/, "PostGIS is added later on purpose (spatial_ref_sys drift)");
});

test(".env.example has no password and no SQLite address", () => {
  const env = read(".env.example");
  assert.match(env, /^POSTGRES_PASSWORD=""$/m);
  assert.match(env, /^DATABASE_URL="postgresql:\/\/laluan:PUT_THE_SAME_PASSWORD_HERE@127\.0\.0\.1:5432\/laluan\?schema=public"$/m);
  assert.doesNotMatch(env, /^DATABASE_URL="file:/m);
});

test("scripts only apply migrations and never reset or push", () => {
  const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
  assert.equal(scripts["db:push"], undefined);
  assert.equal(scripts["db:migrate"], "prisma migrate deploy");
  assert.equal(scripts["db:copy-from-sqlite"], "tsx scripts/copy-sqlite-to-postgres.ts");
  for (const [name, command] of Object.entries(scripts)) assert.doesNotMatch(command, /migrate reset|db push|--force-reset|down -v/, name);
});

test("tables are copied parents first", () => {
  // Every relation field points at a model that is earlier in COPY_ORDER.
  const modelNames = [...schema.matchAll(/^model (\w+) \{/gm)].map(m => m[1]);
  const lower = (name: string) => name[0].toLowerCase() + name.slice(1);
  assert.deepEqual([...COPY_ORDER].sort(), modelNames.map(lower).sort(), "every model is copied");
  for (const block of schema.split(/^model /m).slice(1)) {
    const owner = lower(block.slice(0, block.indexOf(" ")));
    for (const match of block.matchAll(/^\s+\w+\s+(\w+)\s+@relation\([^)]*fields:/gm)) {
      assert.ok(COPY_ORDER.indexOf(lower(match[1]) as never) < COPY_ORDER.indexOf(owner as never), `${match[1]} before ${owner}`);
    }
  }
});

test("the copy refuses a non-empty target and checks counts and ids", () => {
  const target = zero();
  assert.deepEqual(nonEmptyTables(target), []);
  target.hazardReport = 1;
  assert.deepEqual(nonEmptyTables(target), ["hazardReport"]);
  const source = zero(); source.hazardReport = 2;
  assert.deepEqual(countMismatches(source, target), [{ model: "hazardReport", source: 2, target: 1 }]);
  assert.equal(idFingerprint(["b", "a"]), idFingerprint(["a", "b"]), "order does not matter");
  assert.notEqual(idFingerprint(["a", "b"]), idFingerprint(["a", "c"]));
  assert.deepEqual(batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("the target must be Postgres, never a SQLite file", () => {
  assert.match(targetProblem(undefined) ?? "", /not set/);
  assert.match(targetProblem("file:./dev.db") ?? "", /must point to Postgres/);
  assert.equal(targetProblem("postgresql://laluan:x@127.0.0.1:5432/laluan"), null);
  assert.equal(snapshotFolderName(new Date("2026-11-22T14:05:09Z")), "sqlite-snapshot-2026-11-22T14-05-09");
});

test("the copy script only ever reads a snapshot of the SQLite file", () => {
  const script = read("scripts/copy-sqlite-to-postgres.ts");
  assert.match(script, /copyFile\(source \+ suffix, snapshot \+ suffix, constants\.COPYFILE_EXCL\)/);
  assert.match(script, /new LegacyClient\(\{ datasourceUrl: "file:" \+ snapshot/);
  assert.doesNotMatch(script, /datasourceUrl: "file:" \+ source/);
  assert.doesNotMatch(script, /\b(unlink|rm|rmdir|writeFile|truncate)\(/, "never deletes or writes files");
  assert.ok(script.indexOf("nonEmptyTables(targetCounts)") < script.indexOf("$transaction"), "checks the target before copying");
  assert.ok(script.indexOf("if (dryRun)") < script.indexOf("$transaction"), "a dry run stops before copying");
});
