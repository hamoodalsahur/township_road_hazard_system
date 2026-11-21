import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { cn } from "../src/lib/utils";
import { MANAGEMENT_SECTIONS } from "../src/lib/management-sections";

// Night Desk foundation (roadmap 4, chosen by the owner on 21 November 2026, mockup E2).
const read = (file: string) => readFileSync(file, "utf8");
const UI = ["button", "input", "checkbox", "tabs", "dialog"].map(name => `src/components/ui/${name}.tsx`);

test("Tailwind has the night chrome colours and the Barlow families", () => {
  const config = read("tailwind.config.ts");
  assert.match(config, /night: \{ \.\.\.NIGHT/);
  assert.match(config, /sans: \['"Barlow"'/);
  assert.match(config, /display: \['"Barlow Semi Condensed"'/);
});

test("cn lets later classes win and keeps our named text sizes apart from colours", () => {
  assert.equal(cn("h-11 px-5", "px-4"), "h-11 px-4");
  assert.equal(cn("text-caption text-slate-600", "text-small"), "text-slate-600 text-small");
  assert.equal(cn("text-caption", "text-night-muted"), "text-caption text-night-muted");
});

test("shadcn/ui components are set up and restyled to our tokens", () => {
  assert.ok(existsSync("components.json"));
  assert.match(read("components.json"), /"utils": "@\/lib\/utils"/);
  for (const file of UI) {
    const source = read(file);
    assert.match(source, /from "@\/lib\/utils"/, `${file} uses cn`);
    assert.doesNotMatch(source, /oklch|lucide-react/, `${file} still has generator defaults`);
  }
  const button = read("src/components/ui/button.tsx");
  for (const variant of ["primary", "approve", "reject", "secondary", "ghost", "night", "nightGhost"]) assert.match(button, new RegExp(`${variant}:`));
  assert.match(button, /default: "h-11/, "default buttons are 44 px touch targets");
});

test("the shell frames every page with the navy top bar and a phone tab bar", () => {
  const shell = read("src/components/management/ManagementShell.tsx");
  assert.match(shell, /bg-night-bar/);
  assert.match(shell, /HeaderSlotContext\.Provider/);
  assert.match(shell, /ref=\{setHeaderSlot\}/);
  assert.match(shell, /PHONE_TAB_IDS:readonly ManagementSectionId\[\]=\["overview","incidents","maps"\]/);
  assert.match(shell, /placement="sheet"/);
  assert.match(shell, /Log out/);
  assert.match(shell, /Demo service: fictional reports, not live road conditions/);
  // Every section is reachable on a phone: three tabs plus the rest under "More".
  const tabs = ["overview", "incidents", "maps"];
  const more = MANAGEMENT_SECTIONS.filter(section => !tabs.includes(section.id));
  assert.equal(tabs.length + more.length, MANAGEMENT_SECTIONS.length);
});

test("page headers are portalled into the shell's navy band", () => {
  const heading = read("src/components/management/ManagementSectionHeading.tsx");
  assert.match(heading, /createPortal\(band,slot\)/);
  assert.match(heading, /bg-night text-night-text/);
  assert.match(heading, /font-display/);
  assert.match(read("src/components/management/pages/OverviewPage.tsx"), /<Button variant="nightGhost" size="icon"/);
});
