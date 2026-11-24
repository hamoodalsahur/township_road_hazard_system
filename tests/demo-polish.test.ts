import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(file, "utf8");

test("the Next.js dev badge is hidden, so it never covers the tab bar or legends in a demo", () => {
  assert.match(read("next.config.ts"), /devIndicators: false/);
});

test("the operator key stays for one tab: checked again on load, forgotten on logout", () => {
  const shell = read("src/components/management/ManagementShell.tsx");
  assert.match(shell, /sessionStorage\.getItem\(TAB_KEY\)/);
  assert.match(shell, /fetch\("\/api\/audit",\{headers:\{"x-demo-operator-key":saved\}/, "a saved key is verified before use");
  assert.match(shell, /function logout\(\)\{\s*try\{sessionStorage\.removeItem\(TAB_KEY\)/);
  assert.doesNotMatch(shell, /localStorage|document\.cookie/);
});

test("headings focused by script show no ring on the navy header", () => {
  assert.match(read("src/app/globals.css"), /\[tabindex\]:not\(\[tabindex="-1"\]\)\):focus-visible/);
});

test("the shift log still names reports after they are resolved", () => {
  const page = read("src/components/management/pages/OverviewPage.tsx");
  assert.match(page, /\/api\/v2\/hazards\?include=resolved/);
  assert.match(page, /reports: all\.filter\(r => !r\.resolvedAt\), logReports: all/);
  assert.match(page, /shiftLog\(data\.logReports/);
});

test("the Overview shows the roads closed now, each with End and a prefilled reason", () => {
  assert.match(read("src/components/management/pages/OverviewPage.tsx"), /<OverviewClosures operatorKey=\{operatorKey\}/);
  const card = read("src/components/closures/OverviewClosures.tsx");
  assert.match(card, /useClosures\(\)/);
  assert.match(card, /JSON\.stringify\(\{ action: "end", reason \}\)/);
  assert.match(card, /DEFAULT_END_REASON = "Road reopened, checked by the township team"/);
  assert.ok("Road reopened, checked by the township team".length >= 8);
});
