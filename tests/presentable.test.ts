import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

// Presentation polish (23 Nov 2026): front page, About and privacy, a clean demo set, current route address.
const read = (file: string) => readFileSync(file, "utf8");

test("the front page is in the Night Desk look and leads to the map and operator sign-in", () => {
  const home = read("src/app/page.tsx");
  assert.match(home, /bg-night-bar/);
  assert.match(home, /href="\/resident"/);
  assert.match(home, /href="\/management"/);
  assert.match(home, /all reports and closures are fictional/);
  assert.doesNotMatch(home, /hackathon|lucide-react|teal-800|font-extrabold/i);
  assert.equal(existsSync("src/components/SiteHeader.tsx"), false, "the old hackathon header is gone");
});

test("About and privacy says what is kept where and who sees the way-home points", () => {
  const about = read("src/app/resident/about/page.tsx");
  for (const phrase of [/fictional demo data/, /kept in this browser only/, /OpenRouteService/, /location data removed/]) assert.match(about, phrase);
  assert.match(read("src/components/resident/ResidentShell.tsx"), /href="\/resident\/about"/);
});

test("demo:prepare only shows its plan unless told to apply, archives instead of deleting, and can be undone", () => {
  const script = read("scripts/prepare-demo.ts");
  assert.match(script, /const apply = args\.includes\("--apply"\)/);
  assert.match(script, /if \(!apply\) \{ console\.log\("\\nNothing was changed/);
  assert.doesNotMatch(script, /deleteMany|\.delete\(|\$executeRaw/, "nothing is deleted");
  assert.match(script, /sourceMode: ARCHIVED/);
  assert.match(script, /--restore/);
  assert.match(script, /the demo set is already there/, "never a second demo set");
  assert.match(script, /targetProblem\(process\.env\.DATABASE_URL\)/, "Postgres only");
  assert.match(read("package.json"), /"demo:prepare": "tsx scripts\/prepare-demo\.ts"/);
});

test("archived reports drop out of the public list in the query itself", () => {
  assert.match(read("src/app/api/v2/hazards/route.ts"), /where:\{sourceMode:"simulation",reviewState:\{not:"rejected"\}\}/);
});
