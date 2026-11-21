import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BRAND_GREEN, DARK, NEUTRAL, NIGHT, contrastRatio } from "../src/lib/design-tokens";

const WHITE = "#FFFFFF";

test("contrast helper matches known WCAG values", () => {
  assert.equal(Number(contrastRatio("#000000", WHITE).toFixed(2)), 21);
  assert.equal(Number(contrastRatio(WHITE, WHITE).toFixed(2)), 1);
});

test("tokens keep the anchors from docs/DESIGN.md (Night Desk)", () => {
  assert.equal(NEUTRAL[50], "#F2F4F6"); // page
  assert.equal(NEUTRAL[900], "#111820"); // ink
  assert.equal(BRAND_GREEN[800], "#0B7350"); // jade, positive actions
  assert.equal(NIGHT.band, "#0E1720"); // page headers and primary buttons
  assert.equal(NIGHT.mint, "#7FD4AE"); // current page on the night chrome
});

// Every text/background pair the current pages use with these scales (WCAG AA, 4.5:1).
const TEXT_PAIRS: [string, string, string][] = [
  ["slate-500 on white", NEUTRAL[500], WHITE],
  ["slate-500 on slate-50", NEUTRAL[500], NEUTRAL[50]],
  ["slate-500 on slate-100", NEUTRAL[500], NEUTRAL[100]],
  ["slate-600 on white", NEUTRAL[600], WHITE],
  ["slate-600 on slate-100", NEUTRAL[600], NEUTRAL[100]],
  ["slate-900 on slate-50", NEUTRAL[900], NEUTRAL[50]],
  ["teal-700 on white", BRAND_GREEN[700], WHITE],
  ["teal-700 on teal-50", BRAND_GREEN[700], BRAND_GREEN[50]],
  ["teal-900 on teal-100", BRAND_GREEN[900], BRAND_GREEN[100]],
  // Night chrome: top bar, page headers, primary buttons.
  ["night: text on bar", NIGHT.text, NIGHT.bar],
  ["night: muted on band", NIGHT.muted, NIGHT.band],
  ["night: muted on raised", NIGHT.muted, NIGHT.raised],
  ["night: subtle on band", NIGHT.subtle, NIGHT.band],
  ["night: subtle on bar", NIGHT.subtle, NIGHT.bar],
  ["night: mint on band", NIGHT.mint, NIGHT.band],
  ["night: text on mint", NIGHT.onMint, NIGHT.mint],
  ["night: white on band (primary button)", WHITE, NIGHT.band],
  ["white on teal-600", WHITE, BRAND_GREEN[600]],
  ["white on teal-700", WHITE, BRAND_GREEN[700]],
  ["white on teal-800", WHITE, BRAND_GREEN[800]],
  // Night Ops dark theme, recorded for dark mode (roadmap step 4.5).
  ["dark: ink on page", DARK.ink, DARK.page],
  ["dark: muted on surface", DARK.muted, DARK.surface],
  ["dark: subtle on surface", DARK.subtle, DARK.surface],
  ["dark: subtle on sunken", DARK.subtle, DARK.sunken],
  ["dark: text on accent", DARK.onAccent, DARK.accent],
  ["dark: accent text on surface", DARK.accent, DARK.surface],
];

for (const [name, fg, bg] of TEXT_PAIRS) {
  test(`readable text: ${name}`, () => {
    assert.ok(contrastRatio(fg, bg) >= 4.5, `${name} is ${contrastRatio(fg, bg).toFixed(2)}:1`);
  });
}

test("icons, focus rings and input borders reach 3:1", () => {
  assert.ok(contrastRatio(NEUTRAL[400], WHITE) >= 3); // decorative icons
  assert.ok(contrastRatio(BRAND_GREEN[800], WHITE) >= 3); // focus ring
});

test("global styles use the new tokens and font", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /"Barlow"/);
  assert.match(css, new RegExp(NEUTRAL[50], "i"));
  assert.match(css, new RegExp(BRAND_GREEN[800], "i"));
  for (const old of ["#0f766e", "#17573F", "Atkinson", "Instrument Sans"]) assert.ok(!css.includes(old), `globals.css still has ${old}`);
});

test("layout loads the self-hosted fonts", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /@fontsource\/barlow\/400\.css/);
  assert.match(layout, /@fontsource\/barlow-semi-condensed\/600\.css/);
  assert.ok(!layout.includes("instrument-sans"), "the old font is no longer loaded");
  assert.match(layout, /@fontsource\/ibm-plex-mono\/400\.css/);
});
