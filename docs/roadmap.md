# Roadmap

**Status:** approved by the owner on 9 November 2026. The hackathon version is archived at [archive/roadmap-hackathon.md](archive/roadmap-hackathon.md).
**Written:** 9 November 2026, against `main` at `cbc6972` (web) and `c8dfbdf` (mobile).
**Related:** [PROJECT_NOTES.md](PROJECT_NOTES.md) (status), [WORKING_AGREEMENTS.md](WORKING_AGREEMENTS.md) (how we work), [DESIGN.md](DESIGN.md) (look and feel).

---

## 1. Where we are going

> **A resident can report a road problem in under a minute, see what happened to it, and know before leaving whether their way home is blocked. A township operator can confirm a problem and mark a road as closed, with a reason, in a few clicks.**

Every step below moves toward that sentence. If a step doesn't, it waits.

### What stays the same
- **Next.js** for the website, the API and the management dashboard.
- **Expo** for the phone app, tested on the owner's iPhone through Expo Go.
- **Two repositories,** connected only through the API.
- **Fictional data,** clearly labelled, until there is a real deployment decision.
- **One step at a time:** each step is one branch and one pull request, merged only after the owner's go-ahead.

### Web first (decided 9 November 2026)
- **We refine the website first,** both the management side and the resident side. The phone app waits; its steps are collected in section 3A, "Phone app, later".
- **Residents are still covered.** The resident website works in a phone's browser. The installable web app (phase 7) becomes the phone experience until the Expo app catches up.
- **The phone app must keep working while it waits.** The API it uses (listing reports, sending reports, adding a photo) keeps its current behaviour, and tests in this repository check that.

### What changes on purpose
The hackathon roadmap ruled out three things. This roadmap brings them back, each with a safeguard:

| Hackathon rule | New position | Safeguard |
| --- | --- | --- |
| No routing | Routing comes back for the "way home" feature | Only routes around **operator-confirmed** closures. Always called "a route that avoids reported closures", never "a safe route". |
| Nothing changes road status | Operators can mark a road segment as closed | Requires an operator account, a reason, an audit entry and an end or review date. Unverified reports and AI suggestions can never close a road. |
| No deployment | Hosted, so the phone works away from home Wi-Fi | Real sign-in first, writes locked down, data still labelled fictional, free hosting tiers only |

## 2. The plan at a glance

| Phase | Goal | Size | Needs |
| --- | --- | --- | --- |
| **0. Clean slate** | Tidy repository, a README that works, design direction merged | Small | Nothing |
| **1. New look, step one** | New colours, font and shapes on the website, no layout changes | Small | Phase 0 |
| **2. Foundations** | Real database, real accounts, hosted, works away from home Wi-Fi | Large | Decision G2 |
| **3. Map platform** | One modern free map on the website | Medium | Phase 2 (roads in database) |
| **4. Screens revamp** | Every website screen rebuilt to the design direction | Large | Phases 1 and 3 |
| **5. Closures and report outcomes** | Operators close roads; residents see what happened to their report | Medium | Phase 2, decision G5 |
| **6. Way home** | Home pin, route check, detour around closures, on the resident website first | Large | Phases 3 and 5 |
| **7. Alerts** | "Your way home is affected" while the app is closed | Medium | Phase 6, decision G7 |
| **8. Trust and polish** | Bahasa Malaysia, accessibility, abuse protection, privacy, full end-to-end tests | Medium | Runs alongside from Phase 4 |
| **Phone app (later)** | Bring the Expo app up to the website: look, map, screens, way home | Large | After phase 6 |

**Critical path:** 0 → 1 → 2 → 3 → 5 → 6 → 7, then the phone app. Phase 4 screens run alongside once the map platform is in. Phase 8 items slot in whenever they fit.

"Size" is relative. There is no deadline, so there are no dates.

---

## 3. Phases in detail

Each numbered step is meant to be one pull request. Every step that changes a screen starts with PNG mockups for approval.

### Phase 0: Clean slate

| Step | What | Why |
| --- | --- | --- |
| 0.1 | Merge `docs/DESIGN.md` from `docs/design-direction` | The direction was approved; it should be on `main` |
| 0.2 | Commit `package-lock.json` | The README says `npm ci`, which fails without it |
| 0.3 | Close the seven old hackathon pull requests (#13, #29, #30, #37, #48, #64, #84), each with a one-line note | They are stale and confusing; nothing in them is needed for this plan |
| 0.4 | Pick one product name and use it everywhere | Three names today |
| 0.5 | Retire the public judge demo (`judge-demo/` and its GitHub Pages site) | Not part of the ongoing work; it shows an outdated version |

**Done when:** a fresh clone installs with the README's commands, there is one name everywhere, and the only open pull requests are current work.

### Phase 1: New look, step one

| Step | What |
| --- | --- |
| 1.1 | Website: colours, font (Atkinson Hyperlegible), radii and focus styles from `DESIGN.md` |

**Done when:** before and after screenshots at desktop and phone width are approved, every page still works, and contrast checks pass.

**Why this early:** it is visible, safe and quick, and every later screen builds on it.

### Phase 2: Foundations

Recommended answer to decision G2: move to **Supabase**, a hosted Postgres database with maps support (PostGIS), route calculation (pgRouting), user accounts and file storage, all on a free tier. Prisma stays as the way the code talks to the database.

| Step | What | Protects |
| --- | --- | --- |
| 2.1 | **Service area setting.** Replace the BBR rectangle hard-coded in 3 files with one setting. BBR stays the default. | Needed to test at the owner's own location |
| 2.2 | **Move to Postgres.** New Supabase project, schema moved, plus a one-way copy script that reads the owner's `dev.db` and writes to the new database | The original `dev.db` is only read, never changed. The script is tested on a copy first. |
| 2.3 | **Roads into the database.** The road import writes to a database table | Reads the owner's GeoJSON file and never overwrites it |
| 2.4 | **Photos to private storage.** Approved photos get a public link; others never do | Same privacy rules as today |
| 2.5 | **Operator accounts.** Real sign-in replaces the shared key, with roles (operator, admin) and audit entries showing who did what | The shared development key is retired |
| 2.6 | **Hosting.** Website on Vercel's free tier, with local mode kept for development | Writes need sign-in or rate limits; the demo label stays |
| 2.7 | **Phone app compatibility tests.** Tests in this repository that check the endpoints the phone app uses still behave as they do today | The phone app keeps working while it waits |

**Done when:** the resident website works in a phone's browser away from the PC, an operator signs in with their own account, the owner's old reports and photos are in the new database and checked, and the phone app still works against the local API.

### Phase 3: Map platform

| Step | What |
| --- | --- |
| 3.1 | Website map moves from Leaflet to MapLibre, with OpenFreeMap's quiet "Positron" style and the new marker set from `DESIGN.md` |
| 3.2 | Marker clustering, a legend showing only what's on screen, and road-inspection mode |

**Done when:** the new map is smooth on a desktop and in the iPhone's browser.

### Phase 4: Screens revamp

Order follows `DESIGN.md`, section 15. Each step needs mockups approved first.

| Step | Screen |
| --- | --- |
| 4.1 | Management map page: full-screen map, floating filters, side panel |
| 4.2 | Management overview (decision queue first) and incident review (fixed decision buttons, keyboard shortcuts) |
| 4.3 | Resident website: map, report in three steps, "My reports". The simulation moves to management. Checked at phone width in the iPhone's browser. |
| 4.4 | Motion pass: only the animations listed in `DESIGN.md` |

### Phase 5: Closures and report outcomes

| Step | What |
| --- | --- |
| 5.1 | **Road closure records.** An operator links a confirmed report or incident to one or more road segments, with a reason, a start time and an end or review time. The closure shows on the map and is audited. |
| 5.2 | **Report outcome in the public API:** received, being checked, confirmed or not, resolved. Operator notes are never included. |
| 5.3 | **Lifecycle track** on the website, and "My reports" showing live status |

**Done when:** a resident sees their report move through every stage, and a closure appears and disappears on the map at the right times.

### Phase 6: Way home

Recommended answer to decision G6: routes are calculated in the database with **pgRouting**, so we don't write our own routing maths.

| Step | What |
| --- | --- |
| 6.1 | **Road network check.** Build the routable network from the road table. Report and fix data problems such as disconnected pieces and wrong one-way tags. The existing topology research tools are reused here. |
| 6.2 | **Route API.** Given a start and an end, return a route that avoids active closures, plus whether the usual route was affected. Locations are used for the answer and **not stored**. |
| 6.3 | **Home pin.** The resident sets home by tapping the map. It is stored in the browser only, never on the server. "Start from where I am" is opt-in and uses the browser's location permission. |
| 6.4 | **"Your way home" card.** When the resident opens the site, it shows "clear", or "affected" with the detour on the map. |
| 6.5 | **Own-area test pack.** Import the owner's area locally, add fictional closures, and work through a checklist. Home coordinates never go into Git. |

**Done when:** at the owner's own location, a fictional closure on the usual route triggers "affected" and a sensible detour, and removing it returns to "clear".

### Phase 7: Alerts

Decision G7 picks the route here.

| Option | Cost | Notes |
| --- | --- | --- |
| **(Recommended) Installable web app with web push** | Free | iPhone supports push for web apps added to the home screen (iOS 16.4 and later). Privacy: the phone subscribes to small map areas, not an exact home. |
| Native push in the Expo app | Apple Developer Program, USD 99 a year | Needed for push from the native app |
| No alerts while closed | Free | The check runs when the app is opened (Phase 6) |

### Phase 8: Trust and polish (alongside)

- **Bahasa Malaysia** (decision G8): first move all text into string files, then translate.
- **Accessibility:** keyboard, screen reader and text-size pass on the main flows.
- **Abuse protection:** rate limits and duplicate detection on public report submission.
- **Privacy notice:** what is collected, why, and how long it is kept, written with Malaysia's PDPA in mind.
- **End-to-end browser tests** for the main flows (report, review, close, route).
- **Error tracking and database backups.**
- **An operator guide.**

### 3A. Phone app, later

Picked up after phase 6. The Expo app keeps working against the API in the meantime (step 2.7).

| Step | What |
| --- | --- |
| P.1 | New colours, font and shapes in `src/constants/theme.ts`, replacing the Expo template colours |
| P.2 | Point the app at the hosted website, keeping local mode for development |
| P.3 | **Map trial:** MapLibre with OpenFreeMap "Positron" inside an Expo DOM component, run on the owner's iPhone in Expo Go. Decision G4 is made from how it feels. |
| P.4 | Phone map moves to the approach chosen in P.3 |
| P.5 | Report flow in three steps, with review and confirmation |
| P.6 | "My reports" with the lifecycle track, and dark mode |
| P.7 | Way home in the app |
| P.8 | A check in the mobile repository that its categories, limits and labels match the API |

---

## 4. Decisions waiting on the owner

| ID | Decision | When it's needed | Recommended |
| --- | --- | --- | --- |
| G1 | Product name | Before any public release | Placeholder "Laluan" in use since 10 Nov 2026 (`src/lib/product.ts`); final name still open |
| G2 | Move to Supabase (Postgres, accounts, storage) | Phase 2 | Yes |
| G3 | Background map | Phase 3 | OpenFreeMap "Positron" (free, no key, commercial use allowed) |
| G4 | How the phone app shows the map | Phone app step P.3 | Decided by how it feels on the iPhone |
| G5 | Operator-confirmed closures may affect routes | Phase 5 | Yes, operator-only, with an end or review date |
| G6 | How routes are calculated | Phase 6 | pgRouting in the database |
| G7 | Alerts while the app is closed | Phase 7 | Installable web app with web push |
| G8 | When to add Bahasa Malaysia | Phase 8 | Prepare early, translate after the screens settle |
| G9 | Merge the two repositories into one | Not now | No; the compatibility tests (2.7) and P.8 are enough for now |

## 5. What we are not doing

- **Switching frameworks** (Flutter, Kotlin, MAUI). Expo Go is the only free official way to test on the iPhone from Windows.
- **Paid services,** unless the owner decides otherwise at a decision point.
- **Closing roads automatically** from unverified reports or AI suggestions.
- **Storing residents' home locations on the server.**
- **Tracking location in the background.**
- **Presenting anything as real emergency information** while the data is fictional. The report flow always says "For emergencies call 999".

## 6. Risks

| Risk | Effect | What we do |
| --- | --- | --- |
| The free Supabase project pauses after a week with no activity | Development database asleep after a break | Resume it from the dashboard. It doesn't matter for development. |
| Expo Go on the App Store lags behind new Expo versions | An SDK upgrade could break iPhone testing | Only upgrade the Expo SDK once Expo Go supports it |
| A web-based map in the phone app feels slow | Poor map experience | Trial first (P.3). Fallback: keep the native map with the new marker design. |
| OpenStreetMap road data has gaps or wrong one-way tags | Odd detours | Data check in 6.1, careful wording, and the owner tests in a familiar area |
| Moving the owner's data | Losing local reports | Copy-only script, backups first, tested on a copy |
| Scope creep | Never finishing | One step at a time; a step that doesn't serve section 1 waits |
| Vercel's free tier is for personal, non-commercial use | Not suitable for a paid service later | Fine for now; revisit if there is a real deployment |

## 7. How progress is tracked

- **Status:** every step updates the status table and change log in `PROJECT_NOTES.md`.
- **Order:** this file says what comes next, and changes only with the owner's agreement.
- **Pull requests:** each one names its step, for example "Step 2.1: service area setting".
