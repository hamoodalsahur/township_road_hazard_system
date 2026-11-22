# Project notes

The running record of what the system can do, what changed and why. Update it with every change. Other people and other AIs work from this file.

**Last updated:** 21 November 2026
**Rules for working on this project:** [WORKING_AGREEMENTS.md](WORKING_AGREEMENTS.md)
**Where we are going:** [roadmap.md](roadmap.md) (approved 9 November 2026)
**Older history:** [progress.md](progress.md), [archive/roadmap-hackathon.md](archive/roadmap-hackathon.md) and the `v2*` files in this folder describe the hackathon milestones. Parts of them are out of date. Where they disagree with this file, this file and the code are authoritative.

---

## 1. What this is

A road-hazard reporting service for Bandar Bukit Raja (BBR):
- **Residents** report problems like floods, fallen trees and potholes, from the phone app or the resident web page.
- **Township operators** review those reports on a management website, group related ones into incidents and follow them to resolution.

It started as a hackathon prototype (Sime Darby Property University Hackathon, October 2026). The hackathon is over, and we are now building it properly at our own pace.

**All report data is fictional.** The road lines come from OpenStreetMap and are unverified. Nothing here is a real warning, road closure or navigation service.

## 2. Repositories

| Repository | What it holds | Default branch | Latest `main` (9 Nov 2026) |
| --- | --- | --- | --- |
| [township_road_hazard_system](https://github.com/hamoodalsahur/township_road_hazard_system) (this one, renamed from `township_flood_system`) | Next.js website, API, management dashboard, SQLite development database | `main` | `71f6b50` |
| [township_system_mobile](https://github.com/hamoodalsahur/township_system_mobile) | Expo / React Native resident app | `main` | `c8dfbdf` |

The two are connected only through the website's API over the local network. They share no code.

## 3. Status

✅ done · ⏳ in progress or waiting · ❌ not built

### Website and API (this repository)

| Feature | Status | Notes |
| --- | --- | --- |
| Management website: six pages (Overview, Incidents, Maps & Simulation, Evidence, AI & Research, System & Audit) | ✅ | Every page has the Night Desk frame (navy top bar, navy page header, phone tab bar). Every management page has the Night Desk layout (21 and 22 Nov 2026), including the full-screen Maps stage. The resident page keeps its older layout until step 4.3, but shows the new pins. |
| Management sign-in | ✅ | A shared development key only. **Not real accounts.** |
| Report review: list and detail, approve or reject with a reason | ✅ | Pinned decision bar, keyboard shortcuts (J/K, A, R, then Enter), next report opens after a decision, works at phone width |
| Private sample photos with separate approval before anything is public | ✅ | |
| Incident grouping with required operator reasons and an audit log | ✅ | |
| Geographic map with BBR road lines and report markers | ✅ | The real 1,269-line road file lives only on the owner's PC. The GitHub copy of `public/data/bbr-roads.geojson` is empty. |
| Resident web page (map, simulation, practice reports) | ✅ | To be restructured by the design revamp |
| Schematic flood simulation and connectivity checker | ✅ | Fictional network, separate from the real map |
| Optional local AI similarity suggestions (Ollama) | ✅ | Advisory only; never acts on its own |
| Automated tests and GitHub checks (tests, typecheck, build) | ✅ | 315 tests pass |
| Public browser-only judge demo | Retired | Removed on 10 Nov 2026 (roadmap step 0.5). The road file it carried is kept at `data/bbr-roads-reference.geojson`. |
| Design revamp | ⏳ | Direction in `docs/DESIGN.md`: **Night Desk**, chosen 21 Nov 2026. Done on every management page (21 and 22 Nov 2026). The resident pages follow in step 4.3. Step 1.1 done (colours, font, corners). Overview and Incidents rebuilt (step 4.2). Hazard markers now use Phosphor glyph pins on the Incidents screen; the maps still use emoji until phase 3. |
| Residents can see the full outcome of a report (including "Resolved") | ❌ | The public reports API does not expose incident status |
| "My reports" on the resident website | ❌ | |
| Real user accounts and sign-in | ❌ | |
| Hosted deployment and production database | ❌ | Write APIs only work in local development by design |
| Bahasa Malaysia | ❌ | Open question |

### Mobile app (`township_system_mobile`)

These come from that repository's README and docs. I have not re-tested them on a phone.

| Feature | Status | Notes |
| --- | --- | --- |
| Choice between sample data and the local website backend, with a connection test | ✅ | |
| Send a fictional report from the phone to the website | ✅ | |
| Interactive map with report markers and a "choose point on map" picker | ✅ | Road lines need a local script run against the owner's GeoJSON |
| Optional sample photo upload after sending a report | ✅ | |
| "My reports" on the phone | ❌ | |
| Dark mode | ❌ | The app still uses the Expo template colours |
| Design revamp | ⏳ | Same direction as the website |

## 4. Known problems

| Problem | Effect | Source |
| --- | --- | --- |
| The typecheck needs the generated Prisma client | It cannot pass in an environment that blocks Prisma's engine download. It passes in GitHub checks. | Local run on 9 Nov 2026: 20 errors, all inside Prisma callbacks |

## 5. Change log

Newest first. Each entry: what changed, why, and how it was checked.

### 22 November 2026: Road lines for your own area
- **Why:** the owner wants to try the system around where they actually are, not the hackathon's BBR. Step 2.1 already moved the accepted area; the road lines were still BBR-only.
- **What:**
  - Each area has its own road file: BBR keeps `public/data/bbr-roads.geojson` (never touched); any other area uses `public/data/roads/<area>.geojson`, which is gitignored.
  - `npm run geo:import-area` downloads that file from OpenStreetMap for the active area (bounding box plus about 200 m, roads touching the area only, no footpaths). It refuses BBR and a broken area file, will not overwrite an existing file without `--replace`, keeps the old one in `backup/`, and tries two public mirrors if the main server is busy.
  - Every road reader follows the active area: the Maps stage, the Overview and report mini maps, road candidates, topology, source manifest and access tags.
  - The Overview map only draws reports inside the active area, and says how many older ones are outside it. They stay in Incidents.
- **Privacy:** the owner's area file and road file exist only on their PC. No coordinates are in Git, the PR or these notes.
- **Checked:**
  - 315 tests pass (new: `area-road-files`); typecheck and build pass.
  - The importer's refusals were run by hand (missing area file, BBR). The download itself could not be tried here (no access to OpenStreetMap's servers from the test machine); it is the owner's step.

### 22 November 2026: Postgres in Docker (roadmap step 2.2)
- **Why:** SQLite was fine for a demo, but routing, hosting later (Supabase) and several people using the system need a real database server. The owner chose Postgres in Docker on their PC.
- **What:**
  - `docker-compose.yml`: Postgres 16, reachable from this PC only (`127.0.0.1:5432`), password from `.env`, data in the `laluan-pgdata` volume.
  - `prisma/schema.prisma` now uses Postgres, with the first migration committed (`prisma/migrations/20261122000000_init`, 12 tables, same structure as before).
  - **One-way copy** `npm run db:copy-from-sqlite` (`--dry-run` to preview): snapshots `dev.db` and its WAL files into `backup/`, reads only the snapshot through a separate read-only client (`prisma/sqlite-legacy/schema.prisma`), refuses a non-empty target, copies in one transaction and checks counts and ids per table.
  - Scripts: `db:up`, `db:down`, `db:migrate` (apply only), `db:migrate:new`, `db:copy-from-sqlite`; `db:push` removed. Guide in `docs/database.md`.
  - **PostGIS deferred** (plan change, explained in `docs/database.md`): its image adds a table Prisma treats as drift and offers to reset the database for. Added deliberately when routing needs it.
- **Checked:**
  - 308 tests pass (new: `postgres-migration`); typecheck and production build pass.
  - End-to-end on a real Postgres 16: migration applied; dry run changed nothing; a 160-row sample (with 30 photos of 200 KB) copied and matched; a second run refused; a WAL-mode database with unsaved changes copied them too, with dates intact; the source file's checksum was unchanged throughout.
  - The app ran against Postgres: report feed, groups, Overview counts, creating a report, approving it, and the audit log.
  - Not checked: Docker on the owner's PC (Windows) and the owner's real `dev.db`. Those are the owner's steps in the PR.

### 22 November 2026: Maps stage in Night Desk (step 4b, roadmap 4.1)
- **Why:** the last part of the restyle, following the approved Maps mockup.
- **What:**
  - **Full-screen map** under the page header. On wide screens a **Layers** panel floats on the left (Needs review / Approved / Built-in examples switches with counts, type, road category, "Near approved reports", road groups) and the **selected report or road** floats on the right. The legend sits along the bottom. On phones the map comes first, then the selected item, then the layers.
  - **New pins on the map:** the same Phosphor pins as everywhere else (glyph = category, colour = severity, outlined = needs review, solid = approved), replacing the emoji markers. Built from fixed values only, never from report text. The resident page's map shows them too.
  - **Selected report panel:** chips, description, the approved photo if there is one, and "Review this report" or "Open the report", linking to that exact report in Incidents.
  - **Add report:** a mode in the left panel. Only while adding does a map click place the report; otherwise clicks select pins and roads.
  - Background tiles are greyed so pins and road lines stand out. Leaflet's layers are kept under the top bar and the panels.
- **Under the hood:** the map's data and rules moved into `useMapWorkspace`, shared by the resident page's map and the new `ManagementMapStage`, so both behave the same. Road details and the research sections are shared components. The old emoji marker styles were removed.
- **Unchanged:** which reports appear (rejected never), the report form's checks and photo handling, road data, the flood simulation.
- **Checked:**
  - 299 tests pass (new: `night-desk-maps`); typecheck and production build pass.
  - Screenshots with mocked data at 1440 and 390 px: layers, a selected report, adding a report, and the resident page. No console errors.
  - Not checked: background tiles (the test machine cannot reach the tile server), a real phone, and your real roads and reports.

### 21 November 2026: Evidence, System & Audit, AI & Research in Night Desk (step 4a)
- **Why:** the last pages of the restyle, following the approved mockups. Maps was split off (4b) because its map code is large and fragile.
- **Evidence:** a photo grid with filters by who can see each photo (Waiting for a decision, Shown to residents, Operators only, and Needs checking when something is inconsistent). Opening a photo shows it large with its description and a link to that exact report. Storage counts and privacy checks load on arrival in a side panel; every counter is still available under "Every counter". A photo counts as "shown to residents" only when the photo and its report are both approved, the same rule as the resident map. Private photos load with the operator key and are released when the page closes.
- **System & Audit:** four status cards (service area, data consistency, road data, AI help) and an "Operator actions" table in plain words (Approved, Rejected, Group opened…, with the operator's reason), plus **Export CSV**. The CSV quotes commas and defuses spreadsheet formulas. The detailed diagnostics and the full audit text are kept in collapsible sections.
- **AI & Research:** the new header and panel styles; no violet notice.
- **Maps:** the new header, neutral panels, Phosphor icons and type. The map itself and the report form behave as before.
- **Older panels** (data quality, map source, topology, access tags, audit, research export, AI evaluation, evidence counters) now follow the type rules: no all-caps labels, no bold, no amber or violet boxes.
- **Removed:** `EvidenceBrowser` (the photo list and detail), replaced by the grid.
- **Checked:**
  - 292 tests pass (new: `night-desk-other-pages`); typecheck and production build pass.
  - Screenshots of all four pages with mocked data at 1440 and 390 px, including the photo dialog. No console errors.
  - Not checked: a real phone, real photos, and the CSV opened in Excel.

### 21 November 2026: Overview and Incidents in Night Desk, with the UI/UX handoff points
- **Why:** step 2 and 3 of the Night Desk restyle, built together at the owner's request. They include the points kept from the owner's UI/UX handoff document (mockups in `docs/design/night-desk/v3-*.png`, approved 21 Nov). The handoff's "Civic Teal" palette was not adopted; the owner chose to keep the darker Night Desk colours.
- **Overview:**
  - Header: "3 reports need review", today's counts ("Today: 5 received, 2 approved, 1 rejected"), and the oldest report in its own box with Start reviewing.
  - **Today's timeline** of every report received since local midnight. Hovering or focusing a pin shows what it is; choosing it selects that report. Rejected reports are shown faded and cannot be chosen.
  - Decision cards with large wait times, an "Oldest" tag (the list is oldest first), and a "Review report" link on each.
  - A **"Where" map** of all reports, linked both ways with the cards: choosing a card rings its pin and labels it; choosing a pin selects its card.
  - Groups under review and a **shift log** (new reports, approvals, rejections, new groups, newest first). "Recent reports" was replaced by the shift log.
- **Incidents (report review):**
  - Tabs and the summary line moved into the navy header.
  - The list shows its sort order ("Sorted by needs review first"), a search clear button, and "Clear filters" when nothing matches.
  - Selected report: light green tint with a green left bar. Keyboard focus: a blue ring. The review chip is now blue ("Needs review"), apart from the road-condition chip; approved is ink with a tick, never green.
  - Detail order: what and when, description, Evidence, Progress, Similar reports, then the decision. "Enlarge" on photos. **No photo:** a short note, and the map takes the space.
  - The reason box is labelled "Reason for your decision: required, at least 8 characters, kept in the audit log". The photo choice is its own "Public visibility" box, unticked by default as before. Buttons show "Saving…" while a decision is saved.
  - Keyboard shortcut help moved behind a "?" button; the shortcuts work as before.
  - On phones the decision bar stays just above the bottom tab bar.
- **API (read-only addition):** `/api/v2/incident-oversight` accepts `?since=<local midnight>` and then also returns `today: { received, reports }`. The time must be within the last two days. Nothing else in the API changed; approval and rejection rules are unchanged.
- **Accessibility:** focus rings on the navy header and bar are mint instead of jade, which was too dark to see there.
- **Checked:**
  - 285 tests pass (new: `overview-today`, `night-desk-incidents`); typecheck and production build pass.
  - Screenshots of the built app with mocked data at 1440, 1280 and 390 px: Overview, timeline hover, Incidents with and without a photo, the shortcut dialog, phone list and detail. No console errors.
  - Not checked: a real phone, Safari, a screen reader, and real data on the owner's PC (the map needs the local road file, which only the owner has).

### 21 November 2026: Night Desk foundation and the design audit fixes
- **Why:** the owner asked for a more modern feel. Six directions were mocked up; the owner chose **E2, "dark top, light desk"** (named Night Desk in `DESIGN.md`), with Barlow from the "night shift" option and a larger map. Mockups are in `docs/design/night-desk/`.
- **What (step 1 of 4):**
  - **Fonts:** Barlow for text, Barlow Semi Condensed (`font-display`) for titles and big numbers. Instrument Sans removed.
  - **Colours:** a new `NIGHT` token set (navy chrome, mint for the current page) as Tailwind `night-*`, and cooler blue-grey neutrals for the work area. Contrast pairs added to `tests/design-tokens.test.ts`.
  - **shadcn/ui:** `components.json`, the `cn` helper (`src/lib/utils.ts`, taught our named text sizes) and Button, Input, Checkbox, Tabs and Dialog in `src/components/ui`, restyled to our tokens with Phosphor icons. The CLI's own colour classes did not work with Tailwind 3, so they were replaced by hand.
  - **Frame:** a navy top bar replaces the sidebar; each page's title, summary and actions sit in a navy page header (portalled from `ManagementSectionHeading` into a slot in the shell); phones get a bottom tab bar with "More" as a bottom sheet. Sign-in restyled.
  - **Design audit fixes** from the unslop audit, held since this morning: one type scale, 4 px spacing, icon sizes 14/16/20/24, calmer chips.
- **Not changed yet:** the inside of each page. Overview, Incidents and the rest are restyled in the next steps.
- **Checked:**
  - 265 tests pass; typecheck and production build pass.
  - Screenshots of the built app at 1440, 1280 and 390 px with mocked data: sign-in, all six pages, the phone "More" sheet. No console errors.
  - Not checked: a real phone, Safari, and keyboard-only use of the new "More" sheet (Radix handles focus, but it was not tried by hand).

### 21 November 2026: unslop design audit added to the workflow
- **What:**
  - The unslop skill by Damir Sokolovsky (CC BY 4.0) is copied unchanged into `.claude/skills/unslop`, pinned to commit `620163e`, with its licence and a `SOURCE.md` giving credit and the version.
  - It loads automatically for Claude sessions working in this repository.
- **Rule:** `WORKING_AGREEMENTS.md` section 8 now says every built or restyled screen gets an unslop audit in polish mode, with `DESIGN.md` as the brand.
- **First audit** (`docs/design/unslop-audit-2026-11-21.md`):
  - It found no "AI look" on the Overview and Incidents screens.
  - It did find places where they break our own `DESIGN.md`: text below 13 px, sizes off the scale, 6/10/14 px spacing, icons in 16 sizes, and full stops on one-line captions. These are to be fixed in a follow-up PR.
  - It also lists three points where unslop disagrees with the approved design (font weight 600, pills, the green avatar), for the owner to decide.
- **Checked:**
  - The skill's helper scripts were read before copying. One saves a web page; the other makes a video with ffmpeg. Neither reads secrets or changes settings.
  - They are `.mjs` files, so typecheck and tests do not pick them up.
  - The tests still pass.
- **Setup:** the owner installed Docker Desktop (data on a second drive) and has 16 GB RAM, which is enough for Postgres now and Valhalla routing later.

### 10 November 2026: service area setting (roadmap step 2.1)
- **Design:**
  - The first plan was a rectangle in `.env`. After the owner asked whether that was the best way, especially for the alternative-route feature, it was replaced by a polygon file per area.
  - The owner chose whole-trip rerouting (option 2), so the roadmap's phase 6 now uses a routing provider instead of township-only pgRouting.
- **What:**
  - **Area files:**
    - `config/service-areas/bbr.geojson` holds the BBR area as a polygon. It is the exact old rectangle, so behaviour is unchanged.
    - `local.example.geojson` is a template, with a README explaining how to use it.
    - Any other area file (for example `local.geojson`) is gitignored, so an area near home never reaches GitHub.
  - **Setting:** the server-only `SERVICE_AREA` picks the area (default `bbr`). It is not `NEXT_PUBLIC`, so nothing is built into the page.
  - **Library:** `src/lib/service-area.ts` (point-in-polygon, holes, edges count as inside, size limits) and `src/lib/service-area-server.ts` (reads the file once per server start, and falls back to BBR with a reason).
  - **API:** `GET /api/service-area` gives browsers the area, its bounds and centre.
  - **The three checks:** the report form, the server report check and the nearby-roads check all use the area. The messages now say "inside the service area (name)".
  - **Map:**
    - It opens showing the whole area, with a faint dashed outline.
    - Picking a spot outside the area shows the error straight away instead of only on submit.
  - **System & Audit:** shows the active area, its size, and why it fell back to BBR if the file had a problem.
  - **Roadmap:** step 2.1 is marked done. Phase 6 and decision G6 are rewritten for whole-trip routing through OpenRouteService or a self-hosted Valhalla.
- **Not changed:**
  - The road import script (its own bounds; never run on the owner's copy).
  - The road file and the database.
  - The mobile app, which has its own copy of the rectangle and stays parked.
  - Road lines for a new area come with step 2.3.
  - **Hosting follow-up:** when the site is hosted (phase 2), the area file must be bundled with the server, for example through Next's `outputFileTracingIncludes`. This has not been needed or tested yet.
- **Tests:**
  - 233 pass, with 8 new ones. They cover: identical answers to the old rectangle (edges included), holes, broken files, fallbacks, unsafe names, both report checks, no leftover copies of the rectangle in `src/`, and the gitignore rules.
  - One older test now checks the new message wording.
- **Checked:**
  - The typecheck has no new errors.
  - On the real pages, with the default area, with `SERVICE_AREA=local` and no file (System & Audit showed the fallback reason), and with a test area elsewhere: the map opened on it, a click outside showed the error, and a click inside cleared it.
  - Not checked: submitting a report end to end (the sandbox has no database), and a real phone.
- **After pulling:** nothing to install. To try your own area, follow `config/service-areas/README.md`.

### 10 November 2026: Overview rebuilt, queue first (roadmap step 4.2, second half)
- **Design:** four mockups (normal, all caught up, load error, phone) approved by the owner. One is saved as `docs/design/overview-desktop.png`.
- **What:**
  - **Title and summary:** the page title is now "Overview". The four number boxes became one summary line, for example "3 reports need your decision · 1 incident group under review · 5 reports in total · 1 group resolved".
  - **"Needs your decision"** comes first:
    - Waiting reports, oldest first (up to 5, with "N more waiting").
    - Each shows its marker, severity, photo indicator and wait time. Waits over a day are in bold.
    - "Start reviewing" opens the oldest one.
    - When nothing is waiting, it shows "All caught up".
  - **Right column:** incident groups under review, and the four most recent reports.
  - **Links into Incidents:** every row opens that exact report or group, through `?report=<id>` or `?incident=<id>`. Incidents reads these once, on the first load, and accepts only plain IDs.
  - **Removed:** "Quick actions", because it repeated the sidebar (`DESIGN.md` section 9).
  - **Advanced:** the review-age and activity panels are kept, folded under "Advanced", and restyled without amber.
  - **Load errors:** when loading fails, nothing old is shown and "Try again" appears. A missing photo-state response only hides the photo indicators.
  - **Page titles:** `ManagementSectionHeading` gained an optional `subtitle`, used for the live summary line.
  - **Logic:** `src/lib/overview-queue.ts`.
- **Tests:** 224 pass, with 9 new ones.
- **Checked:**
  - The typecheck has no new errors.
  - On the real page with stand-in data at 1440×900 and 390×844: all four states, the Advanced panel, clicking a queue row (it opened that report in Incidents) and a group link. No page errors.
  - Not checked: a production build (GitHub checks run it) and a real phone.

### 10 November 2026: installing prepares the database code
- **What:** `package.json` now has `"postinstall": "prisma generate"`, so `npm ci` and `npm install` rebuild the Prisma client every time. The README setup steps drop the separate `npm run db:generate` line and explain the one-command fix if sign-in fails.
- **Why:** after PR #104 the owner ran `npm ci` without `npm run db:generate` (left out of the update steps). That removed the Prisma client, so sign-in could not reach the database and failed. The key had not changed.
- **Safety:** `prisma generate` reads only `prisma/schema.prisma` and writes inside `node_modules`. It never touches `dev.db`, the road file or `.env`.
- **Checked:** a test confirms the script stays in `package.json`. GitHub checks already ran `prisma generate`, so CI is unchanged.

### 10 November 2026: Incidents screen rebuilt (roadmap step 4.2, first half)
- **Why now:** colours alone looked too subtle, so the owner brought the Incidents rebuild forward to see the new style on a real screen. Seven mockups of every state were approved before building; two are saved in `docs/design/`.
- **What:**
  - **Tabs:** "Review reports", "Incident groups" and "Older simulator reports". Old links such as `/management/incidents#report-review` still open the right tab.
  - **Report review:**
    - Cards with a hazard marker, severity chip and review chip.
    - A detail panel with the photo, a small road map, the lifecycle track and the optional AI check.
    - The reason box and the Approve and Reject buttons sit in a bar pinned to the bottom of the panel.
  - **New behaviour:**
    - After a decision, the next report waiting for review opens, with a short confirmation.
    - An empty queue shows "All caught up".
    - Keyboard shortcuts: J/K move through the list, and A or R move focus to the reason box or the button, so Enter is always needed to confirm.
  - **Incident groups:**
    - The same list and detail layout, with the group's severity taken from its linked reports.
    - A status switch and the justification bar pinned at the bottom.
    - A "New incident group" form in the detail panel.
  - **Phone width:** the list and the detail take turns on screen, with a back link and a pinned decision bar.
  - **Shared pieces** in `src/components/hazards/`: Phosphor glyph markers (outlined while being checked, solid once approved), severity and review chips, the lifecycle track and the mini map. Logic is in `src/lib/hazard-presentation.ts`, `src/lib/incident-review-queue.ts` and `src/lib/mini-map.ts`.
  - **Management shell:**
    - Phosphor icons.
    - A badge on Incidents with the number of reports waiting.
    - The demo notice in the top bar.
    - Page titles at weight 600 per `DESIGN.md`.
    - The Incidents title is now "Incidents".
  - **API:** the incident list now also returns each linked report's `impact` (read-only).
- **Kept as before:**
  - Every action, rule and safeguard: reasons of at least 8 characters, separate photo approval, private photo handling, operator key headers, and hiding old data after a failed load.
  - The test-protected labels.
- **Not done:**
  - No "Undo", because there is no way to reverse a decision yet.
  - The marker glyph issue in `DESIGN.md` section 7 (TrafficCone and RoadHorizon look alike) is still open.
  - The mini map shows "Road lines not loaded" where the local road file is the empty GitHub copy.
- **Tests:**
  - 215 pass, with 17 new ones for the helpers and the screen.
  - Five older source checks now ignore spacing (`tests/source-helpers.ts`) because the files were reformatted. One check moved from the old accordion to the list and detail layout. The rules they check are unchanged.
- **Checked:**
  - The typecheck has no new errors (the same 20 Prisma-only ones).
  - Every state was clicked through on the real page with stand-in data at desktop and phone width, including the A then Enter shortcut and J.
  - No page errors.
  - Not checked here: a production build (the sandbox can't generate the Prisma client; GitHub checks run it) and a real phone.
- **After pulling:** run `npm ci` (new package `@phosphor-icons/react`).

### 10 November 2026: new look, step one (roadmap step 1.1)
- **Style chosen:** after a first version (warm paper and Atkinson Hyperlegible), the owner asked for something more modern. Four styles were mocked up on the same two screens: Calm Civic, Crisp Modern, Night Ops and Bold Signal. The owner chose **Crisp Modern** for the light theme, with **Night Ops** as the future dark mode. The two chosen mockups are saved in `docs/design/`.
- **What:**
  - **Colours:** cool neutrals and jade green, in `src/lib/design-tokens.ts`. Tailwind remaps the existing `slate` and `teal` class names onto them, so every page changed without layout edits.
  - **Font:** Instrument Sans, plus IBM Plex Mono for numbers, self-hosted through Fontsource.
  - **Shapes:** rounder corners (10, 18 and 24 px).
  - **Shadows:** soft layered shadows on the existing shadow classes.
  - **Global styles:** focus ring, selection and page background updated, and the map highlight colours use the jade.
  - **Recorded for later:** the Night Ops dark colours are stored in the tokens. Dark mode itself is roadmap step 4.5.
- **Docs:**
  - `DESIGN.md` sections 5 (colour), 6 (type), 8 (shape and elevation) and 14 (replaced decisions) updated.
  - Roadmap step 1.1 reworded, and step 4.5 (dark mode) added.
- **Not changed yet:**
  - Layouts. The card-based screens in the mockups come in phase 4.
  - Warning colours, AI panel colours, blue road lines and emoji markers (phases 3 and 4).
- **Checked:**
  - Contrast tests cover every light pair in use and the dark theme pairs. 198 tests pass.
  - The typecheck shows no new errors.
  - Before and after screenshots of five pages at desktop width and two at phone width.
- **After pulling:** run `npm ci` (font packages changed).

### 10 November 2026: judge demo retired (roadmap step 0.5)
- **What:**
  - Removed the browser-only judge demo page (`judge-demo/`) and the GitHub Actions workflow that published it to GitHub Pages.
  - Moved its road file, unchanged, to `data/bbr-roads-reference.geojson`, with a `data/README.md` covering use and OpenStreetMap attribution.
  - Removed the README's links to the demo.
- **Why:** the hackathon is over, and the demo showed an outdated version.
- **Checked:**
  - The moved road file has the same Git fingerprint as before and 1,269 features.
  - All tests pass.
  - No remaining references to `judge-demo/` outside the archive.
- **Pages site:** the owner unpublished the live GitHub Pages site in the repository settings on 10 November 2026. Removing the workflow alone would not have taken it down.

### 10 November 2026: one placeholder name (roadmap step 0.4)
- **What:** the product now shows one name, **"Laluan"** (Malay for "route"), everywhere it appears: the browser tab title, the resident site header, the management sidebar and the README heading.
  - It is a **placeholder, not decided**.
  - It lives in one place, `src/lib/product.ts`, so the final name is a one-line change.
  - The repository name is unchanged.
- **Why:** the product appeared under three different names.
- **Checked:**
  - Two new tests check that pages use the shared name and that the old names are gone. All 175 tests pass.
  - The typecheck shows no errors in the changed files.
  - Before and after screenshots were taken of every place the name appears, at desktop and phone width.
  - A web search found no well-known app called "Laluan". That is not a trademark check.

### 10 November 2026: old pull requests closed (roadmap step 0.3)
- **What:** closed the seven hackathon pull requests that were still open (#13, #29, #30, #37, #48, #64, #84). Each has a one-line note saying what replaced it. Their branches were kept.
- **Why:** they were stale and confusing.
- **Checked before closing:** each pull request's files were compared with `main`.
  - Five were replaced by different work on `main`: #13, #30, #37, #48 and #64.
  - #29's one-click scenario presets and #84's hackathon demo playbook never reached `main`. They stay available on their branches.
- **Checked after closing:** no pull requests are open, and all seven branches still exist on GitHub.

### 10 November 2026: lockfile and safer line endings (roadmap step 0.2)
- **What:**
  - Added `package-lock.json`.
  - Added `.gitattributes` with `*.geojson -text`, so Git never changes line endings in road data files.
  - Ignored a local `backup/` folder.
- **Why:**
  - The README says `npm ci`, which fails without a lockfile.
  - On 9 November, a stash and pop on the owner's Windows PC rewrote the real road file with Windows line endings: 1,124,031 bytes became 1,177,459. The 53,428 extra bytes are one per line; the map content was unchanged. The new rule stops that.
- **Checked:**
  - The lockfile lists 206 packages, all from the public npm registry, including the Windows build tools.
  - `npm ci` succeeds on a clean copy, and the full test suite passes.
  - The line-ending problem was reproduced with Windows Git settings: without the rule, a stash and pop added one byte per line; with the rule, the file stayed identical.

### 9 November 2026: web first
- **What:** the roadmap now refines the website first. Mobile steps moved to a "Phone app, later" list (roadmap section 3A). "Way home" is built on the resident website first.
- **Why:** owner's decision, to avoid working on two apps at once.
- **Safeguard:** step 2.7 adds tests in this repository that check the API the phone app uses keeps working while the app waits.
- **Checked:** docs only.

### 9 November 2026: design direction approved (roadmap step 0.1)
- **What:** merged `docs/DESIGN.md` into `main` and marked it approved. Its open decisions now point to the roadmap's decision list.
- **Why:** the owner approved the direction. Every later screen builds on it.
- **Checked:** docs only. Links between `DESIGN.md`, `roadmap.md` and these notes checked.

### 9 November 2026: new roadmap
- **What:** replaced `docs/roadmap.md` with the post-hackathon roadmap and moved the old one to `docs/archive/roadmap-hackathon.md`. The roadmap has:
  - phases 0 to 8, with one pull request per step;
  - decision points G1 to G9;
  - a "not doing" list and risks.
- **Why:** the hackathon roadmap ruled out routing, road closures and deployment. The new direction (the "way home" feature, a hosted system) needs all three, each with a safeguard.
- **Also decided:** stay with Next.js and Expo. Flutter and other frameworks were compared and rejected, because they need a Mac to test on an iPhone, while Expo Go works from Windows for free.
- **Checked:** facts cited in the roadmap were checked against the code (the three hard-coded BBR area checks, the `judge-demo/` folder) and against current vendor documentation (Expo, Supabase, OpenFreeMap, Vercel).

### 9 November 2026: notes and working agreements
- **What:** added this file and `WORKING_AGREEMENTS.md`.
- **Why:** the old progress notes were out of date, and work now runs across separate sessions.
- **Checked:**
  - Tests run on `main`: 173 pass.
  - GitHub check status and open pull requests read from GitHub.
  - Mobile status read from its README and docs, not re-tested.

### 9 November 2026: design direction proposed (not merged)
- **What:** `docs/DESIGN.md`, plus a style tile image, on branch `docs/design-direction`. It covers:
  - colours, type and icons;
  - map markers that show severity and certainty;
  - a progress track for each report;
  - layouts for each surface;
  - animation rules.
- **Why:** the owner asked for a look that suits real users, before adding more functionality.
- **Checked:**
  - Every colour pair passes WCAG AA contrast, checked by script.
  - The style tile was rendered in a real browser with no errors.
- **Waiting on:** owner approval.

### 23 October 2026 and earlier
Hackathon milestones up to PR #95. See `progress.md` and the `v2*` documents.
