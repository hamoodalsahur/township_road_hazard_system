import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCT_NAME } from "../src/lib/product";

const NAME_FILES = [
  "src/app/layout.tsx",
  "src/components/SiteHeader.tsx",
  "src/components/management/ManagementShell.tsx",
];
const OLD_NAMES = ["Township Flood Intelligence", "Hazard Intelligence"];

test("product name is set and short enough for a phone header", () => {
  assert.ok(PRODUCT_NAME.trim().length > 0);
  assert.ok(PRODUCT_NAME.length <= 24);
});

test("pages take the name from src/lib/product.ts instead of hard-coding it", () => {
  for (const file of NAME_FILES) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /PRODUCT_NAME/, `${file} should use PRODUCT_NAME`);
    for (const old of OLD_NAMES) assert.ok(!source.includes(old), `${file} still says "${old}"`);
  }
});
