# Project notes

The running record of what the system can do, what changed and why. Update it with every change. Other people and other AIs work from this file.

**Last updated:** 9 November 2026
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
| Management website: six pages (Overview, Incidents, Maps & Simulation, Evidence, AI & Research, System & Audit) | ✅ | Final hackathon layout from PR #85 |
| Management sign-in | ✅ | A shared development key only. **Not real accounts.** |
| Report review: list and detail, corroborate or reject with a reason | ✅ | |
| Private sample photos with separate approval before anything is public | ✅ | |
| Incident grouping with required operator reasons and an audit log | ✅ | |
| Geographic map with BBR road lines and report markers | ✅ | The real 1,269-line road file lives only on the owner's PC. The GitHub copy of `public/data/bbr-roads.geojson` is empty. |
| Resident web page (map, simulation, practice reports) | ✅ | To be restructured by the design revamp |
| Schematic flood simulation and connectivity checker | ✅ | Fictional network, separate from the real map |
| Optional local AI similarity suggestions (Ollama) | ✅ | Advisory only; never acts on its own |
| Automated tests and GitHub checks (tests, typecheck, build) | ✅ | 173 tests pass on `main`; checks for `71f6b50` are green on GitHub |
| Public browser-only judge demo | Retired | Removed on 10 Nov 2026 (roadmap step 0.5). The road file it carried is kept at `data/bbr-roads-reference.geojson`. |
| Design revamp | ⏳ | Direction in `docs/DESIGN.md`. Step 1.1 done (new colours, font and corners, no layout changes). Screens follow in phases 3 and 4. |
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
