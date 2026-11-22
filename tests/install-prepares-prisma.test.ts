import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// `npm ci` deletes node_modules, including the generated Prisma client. Without regenerating it,
// management sign-in fails (it checks the key through /api/audit, which reads the database).
test("installing regenerates the Prisma client without touching the database", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  // Both clients: the app's (Postgres) and the read-only one the SQLite-to-Postgres copy uses.
  assert.equal(pkg.scripts.postinstall, "prisma generate && prisma generate --schema prisma/sqlite-legacy/schema.prisma");
  assert.doesNotMatch(pkg.scripts.postinstall, /db push|migrate|seed|reset/);
});
