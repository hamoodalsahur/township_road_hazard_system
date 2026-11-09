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
| Public browser-only judge demo (`judge-demo/`, GitHub Pages) | ✅ | Built for the hackathon; not part of the ongoing work. Keep or remove is an open question. |
| Design revamp | ⏳ | Direction approved and recorded in `docs/DESIGN.md`. Building starts at roadmap phase 1. |
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
| The README quick start says `npm ci`, but there is no `package-lock.json` in the repository | A new developer following the README gets an error on the first install command | `README.md`; checked against the repository tree on 9 Nov 2026 |
| The typecheck needs the generated Prisma client | It cannot pass in an environment that blocks Prisma's engine download. It passes in GitHub checks. | Local run on 9 Nov 2026: 20 errors, all inside Prisma callbacks |
| Seven old pull requests are still open (#13, #29, #30, #37, #48, #64, #84) | Clutter, and #84 holds demo docs that never reached `main` | GitHub, 9 Nov 2026 |
| The product appears under three names | Confusing for users | `src/app/layout.tsx`, `ManagementShell.tsx`, repository name |

## 5. Change log

Newest first. Each entry: what changed, why, and how it was checked.

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
