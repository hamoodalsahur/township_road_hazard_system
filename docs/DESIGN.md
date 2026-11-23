# Design direction

**Status:** approved by the owner on 9 November 2026. Style updated on 10 November 2026 (**Crisp Modern** light theme, **Night Ops** dark mode) and again on **21 November 2026**, when the owner chose **Night Desk** from six mockup options: navy chrome (top bar and page headers) around a light work area, set in Barlow. Night Desk replaces Crisp Modern; Night Ops stays the plan for a full dark mode. The order of work is in [roadmap.md](roadmap.md), phases 1, 3 and 4.
**Reference mockups (current, Night Desk):** [overview](design/night-desk/1-overview.png), [incidents](design/night-desk/2-incidents.png), [maps](design/night-desk/3-maps.png), [evidence](design/night-desk/4-evidence.png), [system](design/night-desk/5-system.png), [operator phone](design/night-desk/6-phone-operator.png) and [resident phone](design/night-desk/7-phone-resident.png), approved 21 November 2026. The resident phone screens preview later roadmap steps (4.3 and 6). The built resident website (step 4.3, 23 November 2026) follows [resident phone, all steps](design/night-desk/8-resident-phone.png) and [resident desktop](design/night-desk/9-resident-desktop.png).
**Earlier mockups (superseded):** [design/reference-crisp-modern.png](design/reference-crisp-modern.png) (light) and [design/reference-night-ops-dark.png](design/reference-night-ops-dark.png) (dark). Incidents screen, approved 10 November 2026: [desktop](design/incidents-review-desktop.png) and [phone](design/incidents-review-phone.png). Overview, approved the same day: [desktop](design/overview-desktop.png). When this file and a mockup disagree, this file wins.
**Applies to:** the management website, the resident website (this repository) and the resident mobile app (`township_system_mobile`).
**Written:** 9 November 2026, against `main` at `71f6b50` (web) and `c8dfbdf` (mobile).

This file sets the look, feel and interaction rules for the product. Read it before changing any interface. Each decision has a one-line reason, so that later changes can argue with the reason instead of the taste.

The anti-slop rules ([miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop)) are used as a review filter on top of this file: once a change is built, check it against them. This file supplies the direction; that repository only rejects generic results. Nothing needs to be installed.

---

## 1. Who we are designing for

We design as if this were a real service in Bandar Bukit Raja. The data stays fictional until there is a real deployment, but the interface should not feel like a demo.

| User | Where they are | What they need to get done | What gets in the way today |
| --- | --- | --- | --- |
| **Resident** | On a phone, often outdoors, sometimes in rain or glare, any age, Malay or English speaker | 1. See what is affecting roads near them. 2. Report a problem in under a minute. 3. Find out what happened to their report. | The resident web page mixes the map, a research simulation and a practice form. There is no "my reports" view, and report outcomes are hard to read. |
| **Township operator** | At a desk, using the system many times a day | 1. Decide on each incoming report quickly and correctly. 2. Group related reports and follow them to resolution. 3. Explain decisions later (audit). | The overview leads with stat cards and shortcut tiles instead of the work. The map page puts six control panels above the map. |

Everything below serves these six jobs. A screen element that serves none of them gets cut or moved to an "advanced" area.

## 2. Design read and dials

> Reading this as: a civic road-hazard reporting service for Malaysian township residents and the operators who review their reports, in a calm cartographic style, dial **ENERGY 1 / RHYTHM 2 / MOTION 2** for resident surfaces and **ENERGY 1 / RHYTHM 1 / MOTION 1** for the management website.

- **ENERGY 1:** people open this when something might be wrong on the road, so the interface should feel steady, not exciting.
- **RHYTHM 2 for residents:** the map, the report flow and the report list are different jobs and can look different.
- **RHYTHM 1 for management:** operators benefit from every page working the same way.
- **MOTION 2 for residents:** panels and sheets move to show where content comes from.
- **MOTION 1 for management:** state changes only. Operators repeat the same actions all day, and repeated animation slows them down.

## 3. Principles

1. **Quiet interface, loud hazards.** The interface uses neutrals and one calm green. Strong colour is reserved for hazards, so the eye goes to the map markers and report severities first.
2. **The decision is the page.** Each screen is built around the one decision made there. The operator's review queue is the overview, not a widget on it.
3. **Honest about certainty.** A report's verification state is always visible, and is shown through marker shape and wording, not colour alone. Unverified never looks the same as confirmed.
4. **Built for a phone in the rain.** Large type, 44 px minimum touch targets, high contrast and short forms. If it works there, it works on a desktop.
5. **One product everywhere.** Web and mobile share the same tokens, the same marker set and the same words for the same states.

## 4. Identity

### Name (open decision)

The product currently appears under three names: "Township Flood Intelligence" (resident header and browser title), "Township Road & Hazard Intelligence" (management) and `township_road_hazard_system` (repository). Pick one before the revamp starts. A short name works better on a phone header. Until the owner decides, use **Township Road & Hazard** and do not design a logo (anti-slop R-23).

### Signature: the report lifecycle track

The motif repeated across the product is a small horizontal track showing where a report is in its life. It carries real information and appears on every report: in the resident's list, the report detail, the operator's review panel and map popups.

```
Received ──── Being checked ──── Confirmed ──── Resolved
                                 └── or: Could not confirm
```

| Stored value | Resident sees | Operator sees |
| --- | --- | --- |
| `unverified` | Being checked | Needs review |
| `corroborated` | Confirmed by the township team | Corroborated |
| `rejected` | Could not confirm (only in the resident's own reports) | Rejected |
| Linked incident `resolved` | Resolved | Resolved |

The "Resolved" step needs the public reports API to expose the linked incident's status, which it does not do today (see section 13).

### Signature: verification by marker fill

- **Unverified report:** white marker with a thick ring in the severity colour.
- **Confirmed report:** solid marker in the severity colour.
- **Resolved:** a small grey marker, hidden unless the "Show resolved" filter is on.

This makes "how sure are we" readable at a glance and does not rely on colour vision.

## 5. Colour

### Roles

- **Navy (night chrome)** frames every screen: the top bar and the page header. Primary buttons are navy too.
- **Neutrals** carry the light work area where reports, photos and decisions live.
- **Jade green** marks positive decisions (Approve), links and focus. **Mint** marks the current page and the "now" line on the night chrome only.
- **The severity scale** is for hazards only.

Nothing else gets a colour.

### Night chrome (Night Desk)

Tailwind: `night-*` (`src/lib/design-tokens.ts`, `NIGHT`).

| Token | Hex | Use | Why |
| --- | --- | --- | --- |
| `bar` | `#0B131B` | Top bar, sign-in page | The darkest step, so the bar reads as a frame, not content |
| `band` (`night`) | `#0E1720` | Page headers, the Overview hero, primary buttons | Navy instead of black: calm, official, and it lets white type sit large |
| `raised` | `#1A2733` | Buttons and search fields on the chrome | One step up from the band |
| `line` / `edge` | `#1F2C38` / `#2A3946` | Bar border / control borders on the chrome | Structure without glare |
| `text` | `#E4ECF2` | Main text on the chrome | Softer than pure white over large areas |
| `muted` / `subtle` | `#9FB0BE` / `#7E91A3` | Summaries / hour ticks and hints on the chrome | Both pass AA on `band` and `bar` |
| `mint` (text on it: `#0B1F17`) | `#7FD4AE` | Current page underline, Incidents badge, the "now" line | The jade family, lifted so it shows on navy |

### Light work area (Night Desk)

Tailwind keeps the `slate` class names for these, so older screens follow automatically.

| Token | Hex | Use | Why |
| --- | --- | --- | --- |
| `page` | `#F2F4F6` | Work-area background, map surround | Cool blue-grey that matches the navy above it |
| `surface` | `#FFFFFF` | Cards, panels, inputs | Content sits on clean white |
| `sunken` | `#EEF1F3` | Wells, fact boxes, filter chips | Recessed without needing a border |
| `line` | `#E1E6EA` | Card borders and dividers | Night Desk uses a hairline border on cards instead of a shadow |
| `field` | `#7D8995` | Input and checkbox borders, decorative icons | Meets 3:1 for interactive boundaries |
| `ink` | `#111820` | Main text | Near-black with the navy's blue cast |
| `muted` | `#46525E` | Secondary text | Readable on every background |
| `subtle` | `#5A6672` | Hints, timestamps | Lightest text allowed, still AA on every background |
| `jade` | `#0B7350` | Approve, links, focus ring | The Malaysian expressway sign green: "go and trust" |
| `jade-tint` / `jade-text` | `#E3F4EC` / `#064E36` | Active filters where a tint is needed | Selection without shouting |
| `selected` (tint / edge / bar) | `#EAF6F0` / `#B9DCCB` / `#0B7350` | The selected report card or row: tint, border and a 4 px left bar | Selection that is visible without a heavy dark border (UI/UX handoff, 21 Nov) |
| `review` (text / tint) | `#1F5A94` / `#E8F0FB` | "Needs review" chip, the current step in Progress, keyboard focus on report rows | Review status gets its own quiet blue, so it is never confused with road condition (severity) or with approval |

### Severity scale (hazards only)

Maps to the stored `impact` value. Each step has a solid colour (markers), a tint (backgrounds) and a text colour for use on the tint.

| Impact | Label | Solid | Tint | Text on tint | Glyph colour on solid |
| --- | --- | --- | --- | --- | --- |
| `suspected_closure` | Possibly closed | `#B42318` | `#FCEBE8` | `#8F1C13` | white |
| `partial_obstruction` | Partly blocked | `#B9480F` | `#FDEEE3` | `#8A3509` | white |
| `caution` | Take care | `#F2B42C` | `#FDF4DC` | `#7A5100` | `ink` |
| `unknown` | Not sure | `#68716C` | `#ECEDEA` | `#47504B` | white |

Every marker has a thin outline in `ink` at 70% opacity. Without it, the amber marker barely shows against the pale page and map background.

### Dark theme (Night Ops)

Required on mobile, which follows the phone's setting, and offered on the website as a setting. Built with the screen rebuilds (roadmap step 4.5).

| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| `page` | `#0D1210` | | `jade` | `#6CC79D` (text on it: `#0B1F17`) |
| `surface` | `#141A17` | | `jade-tint` / text | `#173328` / `#A8E3C7` |
| `sunken` | `#0A0E0C` | | severity solids | `#F2867A`, `#F3A066`, `#F2C04C`, `#A3ABA6` |
| `line` | `#26302B` | | `ink` / `muted` / `subtle` | `#E7ECE8` / `#B2BBB5` / `#949E98` |

In dark mode the map uses a dark background with light road lines, and hazard markers use the lighter severity solids, so they stand out more than in daylight.

### Contrast check

Every text and background pair above passes WCAG AA: 4.5:1 for text, and 3:1 for input borders, icons and map markers. `tests/design-tokens.test.ts` re-checks the pairs in use on every test run, so a token change that breaks contrast fails the tests.

### Rules

- **No gradients, glows or glass.** Nothing here needs them.
- **Green is never used for status.** "Confirmed" is shown with the lifecycle track and a check glyph in `ink`, so green keeps meaning "you can act here".
- **Severity colours never appear on buttons, headings or decoration.**

## 6. Typography

| Role | Family | Why |
| --- | --- | --- |
| Interface text | **Barlow** (OFL licence) | Drawn from the lettering of road signs and number plates, so it suits a road-reporting tool; slightly narrow, which fits long report descriptions and wait times on a phone |
| Page titles, headlines, big numbers such as wait times (`font-display`) | **Barlow Semi Condensed** | The same family, narrower and firmer: headlines read as signage without a second voice |
| Coordinates, report IDs | **IBM Plex Mono** | Fixed width; distinct 0/O and 1/l |

Chosen with Night Desk on 21 November 2026, replacing Instrument Sans (Crisp Modern, 10 November) and Atkinson Hyperlegible before that. Body text is never below 15 px on desktop or 16 px on phones, and weights stay at 400 or more. Numbers that are compared (wait times, counts, clock) use tabular figures (`tabular-nums`).

Packages, all checked on npm:
- **Web:** `@fontsource/barlow`, `@fontsource/barlow-semi-condensed`, `@fontsource/ibm-plex-mono`
- **Mobile (later):** `@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-semi-condensed`, `@expo-google-fonts/ibm-plex-mono`

### Scale (px, line height in brackets)

- **Display:** 32 (38), page titles on desktop only
- **Title:** 24 (30)
- **Heading:** 18 (24)
- **Body:** 16 (24). Mobile body is never below 16.
- **Small:** 14 (20)
- **Caption:** 13 (18), minimum size for any text

### Rules

- **Sentence case everywhere.**
- **No uppercase labels with wide letter-spacing, and no small "eyebrow" labels above headings.** The current UI has more than a dozen of these.
- **Weights:** 400 for text, 500 for navigation and chips, 600 for labels, buttons and titles. Barlow Semi Condensed titles keep normal letter-spacing (the face is already tight). Nothing heavier than 700.
- **Dynamic Type:** respect the phone's text-size setting on mobile, and test at 130%.

## 7. Icons and map markers

**Icon set:** Phosphor (MIT licence; web `@phosphor-icons/react`, mobile `phosphor-react-native`).
- **Why Phosphor:** it has the same glyphs on both platforms and a bold weight that stays legible inside a 36 px marker.
- **Weights:** "regular" in the interface, "bold" inside markers.
- **Migration:** Lucide is replaced gradually as pages are rebuilt.
- **Hazard emoji are retired.** They render differently on every phone and cannot be recoloured for severity.

| Category | Icon | Reason |
| --- | --- | --- |
| Flooding | `Waves` | Water across the road |
| Roadworks | `TrafficCone` | Read as "works" in Malaysia |
| Fallen tree | `Tree` | Literal |
| Pothole | `RoadHorizon` | Road surface; there is no pothole glyph |
| Blocked road | `Barricade` | Literal |
| Storm damage | `CloudLightning` | Literal weather, not decoration |
| Other | `WarningCircle` | Generic, so it is used only for "other" |

**Known issue from the style tile (still open; the Incidents screen uses the table above as is):** at marker size in the bold weight, `TrafficCone` and `RoadHorizon` look alike, and `CloudLightning` reads as a balloon. Before building the marker component, test alternatives at 18 px on a real phone, for example `Barricade` for roadworks with a different glyph for blocked road, or `Lightning` on its own for storm damage.

### Marker spec

- **Shape:** upright rounded pin, 36 px.
  - **Glyph:** category icon, 18 px, bold weight.
  - **Colour:** severity colour.
  - **Fill:** verification state, as described in section 4.
- **Selected:** a 3 px green ring and a scale of 1.15.
- **Clusters:** when markers overlap, show a neutral circle with a count.
- **Labels:** every marker has a text label for screen readers and a tooltip. Category, severity and state are always available as text, never only as shape or colour.
- **Draft pin:** the user's own draft report location uses a distinct green crosshair pin. It is never shaped like a hazard marker.

## 8. Shape, space and elevation

- **Radius (Night Desk):**
  - **10 px:** buttons, inputs, search fields and small controls.
  - **Full (pill):** filter chips, status chips and severity chips.
  - **14 px:** cards and report rows (older screens still use 18 px until they are rebuilt).
  - **24 px:** dialogs and the top corners of mobile bottom sheets.
- **Components:** built on shadcn/ui (`src/components/ui`), restyled to these tokens. See the README there.
- **Spacing:** a 4 px base (4, 8, 12, 16, 24, 32, 48). Use 24 or more between unrelated groups and 8 to 12 inside a group, so whitespace shows grouping.
- **Elevation:**
  - **Soft layered shadows** separate cards and panels from the page, instead of outlines. Three levels: `sm` (cards, rows), `md` (panels), `lg` (layers floating over the map: sheets, popovers, map controls).
  - **Lines** only where content inside one panel needs dividing (for example above a decision footer).
  - **The selected item** gets a 2 px jade ring, not just a tint, so selection is clear without colour alone.
- **Dark mode:** shadows don't show on dark backgrounds, so dark mode uses `line` borders instead.
- **Touch targets:** 44 × 44 px minimum on every surface, including desktop table actions.

## 9. Layout by surface

### Management website

- **Frame (Night Desk, built 21 November 2026):**
  - A navy **top bar** with the six sections, the Incidents count in mint, a "Demo data" note, Resident view and Log out. It replaces the left sidebar, giving the work area the full width.
  - A navy **page header** under it on every page: title, a live one-line summary, actions on the right (Refresh, search) and, where a page has them, tabs along its bottom edge.
  - **Phones:** the top bar keeps only the name and the demo note; a white **bottom tab bar** has Overview, Incidents and Maps, and "More" opens a bottom sheet with Evidence, AI & Research, System & Audit, Resident view and Log out.
- **Overview (built 21 November 2026):** the header says "3 reports need review", with today's counts and the oldest report in its own box, and **today's timeline** of reports with a "now" line. Below: decision cards with large wait times and a "Review report" link, groups under review, a shift log, and a "Where" map. Cards, timeline and map share one selection.
- **Evidence, System & Audit, AI & Research (built 21 November 2026):** Evidence is a photo grid filtered by who can see each photo, with storage and privacy checks alongside. System leads with four status cards and an "Operator actions" table with CSV export; detail stays in collapsible sections.
- **Maps (built 22 November 2026):** the map fills the screen under the page header, with a floating Layers panel on the left, the selected report or road on the right and the legend along the bottom; on phones they stack under the map. Pins are the same Phosphor pins as everywhere else, and background tiles are greyed so hazards stand out.
- **Incidents (built 21 November 2026):** tabs in the navy header; the list states its sort order; road condition and review status are separate chips; the detail reads what, evidence, progress, similar reports, then the decision; "No photo for this report" is a deliberate note; the reason is labelled as required; the photo choice is a "Public visibility" box; shortcut help sits behind "?".
- **Overview, queue first:**
  - The first block is "Needs your decision", listing reports oldest first, with their age and severity.
  - The four stat cards shrink to a single summary line. They are not decisions.
  - The "Quick actions" tiles are removed, because they repeat the sidebar.
  - Each row opens that exact report or group in Incidents, and "Start reviewing" opens the oldest waiting report. Waits over a day are shown in bold, not red, because red belongs to hazards.
  - Beside the queue: incident groups under review and the four most recent reports. The review-age and activity panels stay folded under "Advanced".
- **Incidents:** keep the list-and-detail review layout from #85, which already fits the job.
  - Add the lifecycle track to the detail panel.
  - Move the decision buttons into a fixed footer of the detail panel, so they never scroll away.
  - Keyboard shortcuts: J/K to move through the list, A to approve and R to reject (A matches the "Approve report" button). A and R never decide on their own: they move focus to the reason box when the reason is too short, otherwise to the matching button, and Enter confirms.
  - Report review and incident groups are tabs. After a decision the next report waiting for review opens, and an empty queue says "All caught up".
  - On phones the list and the detail take turns filling the screen, and the decision bar stays pinned to the bottom.
- **Maps:** the map fills the screen below the header.
  - **Filters:** a compact toolbar floating at the top left.
  - **Legend:** collapsible, at the bottom left.
  - **Details:** a side sheet slides in from the right when something is selected.
  - **Reporting:** a separate mode with a crosshair cursor.
  - **Research tools** (topology, candidate groups, source inspection) move to System & Audit.
  - **The flood simulation** becomes a second tab, "Simulation", in this section.
- **Evidence, AI & Research, System & Audit:** dense, plain tables and lists. Same page header, same spacing, no decoration.

### Resident website

Rebuild it as the web version of the mobile app, with the same three jobs:
- **Map:** hazards near the BBR area.
- **Report a hazard:** a step-by-step form.
- **My reports:** reports sent from this browser, each with its lifecycle track.

The schematic flood simulation and connectivity checker are research tools, not resident tasks. They move to the management "Simulation" tab.

**Built in step 4.3 (23 November 2026):** `/resident` (map), `/resident/report` and `/resident/mine`, in the Night Desk frame (navy top bar; white tab bar on phones).
- **Map:** only reports inside the active service area, newest first, in "On the map now" (a bottom sheet on phones, a side panel on desktop). Picking a card or a pin selects both. An approved photo shows in the selected card. Road lines are drawn thin and grey under the pins.
- **Report:** the web order is What, then Where, then Words and photo, as in the approved mockup (the phone app starts with Where). Step 2 keeps the pin fixed in the middle and moves the map under it. "Use my location" asks the browser only when pressed; the position only moves the map. The phone tab bar is hidden during the steps and a close button takes its place.
- **My reports:** report ids, type, severity and send time only, in this browser (`laluan.myReports.v1`, at most 50). Progress comes from `GET /api/v2/hazards/status?ids=…`, which returns review state, incident status and the time of the last change, never notes, text, photos or places.
- **Not built yet:** "Your way home" and notifications (phase 6); the mockup's "Near you" distances (they need the resident's location).

### Mobile app

- **Tabs:** Map, Report, My reports, About. Report is a tab rather than a floating button, so it is always one tap away and keeps its label.
- **Map:** the map fills the screen. Details open in a bottom sheet that has a half-open and a full-open position.
- **Report:** three steps on separate screens, each with a progress indicator:
  1. Where: tap the map or use the current pin.
  2. What: category and how bad it is.
  3. Details and photo: optional.

  Then a review screen and a confirmation that shows the lifecycle track at "Received".
- **My reports:** stored on the device, as today. Pull to refresh.

## 10. The map

**Basemap (decided 23 November 2026, roadmap 3.1):** OpenFreeMap's "Positron" style, drawn by MapLibre (`src/components/maps/BaseMap.tsx`). Free, no key, no cookies; MapLibre shows the required credit from the style. The schematic flood simulation keeps its own Leaflet drawing.

**Basemap (background to the decision):**
- **The problem:** the standard OpenStreetMap tiles are colourful and busy, which works against "quiet interface, loud hazards". The OSM Foundation's tile usage policy also discourages relying on its servers for an app.
- **The fix:** switch to a muted basemap, for example CARTO Positron, Stadia Alidade Smooth or MapTiler.
- **Before choosing:** check each provider's terms, free-tier limits and whether it needs an API key.

**Road overlay:**
- **The problem:** the 1,269 imported OSM road lines, drawn in four blues, compete with both the basemap and the hazards.
- **Default view:** the basemap already shows roads, so the overlay draws nothing.
- **Road-inspection mode:** a toggle draws the overlay as thin `ink` lines, with weight showing road class. Selecting a road highlights it in green.
- **Report vicinity:** the dashed strokes near confirmed reports stay, recoloured to the severity scale.
- **Layer order, bottom to top:** basemap, road overlay, report vicinity, resolved markers, active markers, selected marker, draft pin.
- **Legend:** shows only what is currently on the map.
- **Road closures (step 5.1, 23 November 2026):** closed roads are red (the "Possibly closed" severity colour) with a white casing and a white dashed centre, so they do not rely on colour alone; "one lane only" drops the dashes. A label reads "Closed until 23:40". Residents see only active closures, listed first in "On the map now". Mockups: [operator](design/night-desk/10-closures-operator.png) and [resident](design/night-desk/11-closures-resident.png).
- **Built (23 November 2026):** clustering bubbles take the colour of their most serious report and zoom in when selected; the selected pin is never clustered. Residents see no road overlay; operators turn on "Inspect road lines" on Maps. Pins are buttons (keyboard and screen reader), not drawn into the map canvas.

## 11. Motion

| Surface | Library | Why |
| --- | --- | --- |
| Website | **Motion** (`motion`, imported from `motion/react`) | Gives exit animations, layout animations and reduced-motion support with little code. Supports React 18 and 19. |
| Mobile | **React Native Reanimated** (already installed, v4) | Motion's React API is for the web; Reanimated is the native equivalent and is already a dependency. |

Pin a Motion release that has been out for at least two weeks. Wrap the website in `<MotionConfig reducedMotion="user">`.

**Allowed, with their purpose:**

| What moves | How | Duration | Purpose |
| --- | --- | --- | --- |
| Map side sheet and mobile bottom sheet | Slide in from their edge, with a spring on mobile | 220 ms enter, 160 ms exit | Shows where the details came from and where they go |
| Report and incident rows expanding | Height and opacity | 180 ms | Keeps the reader's place in the list |
| List rows when filters change | Layout animation; removed rows fade | 200 ms | Shows which items stayed and which left |
| Tab and segmented-control indicator | Shared layout (`layoutId`) | Spring | Connects the old and new tab |
| Confirmation after submit or review | Slide up and fade, then auto-hide after 5 s, with a close button | 200 ms | Confirms the action without blocking |
| Selected map marker | CSS scale to 1.15 | 150 ms | Links the marker to the open sheet |

**Not allowed:**
- Page-load fade-ins.
- Staggered card entrances.
- Anything that loops or pulses.
- Parallax.
- Animating the Leaflet map container. Leaflet runs its own animation, and Motion would fight it.
- Any animation in the management website beyond state changes.

**Reduced motion:** with the system setting on, durations drop to 0 and sheets appear in place. The existing CSS rule in `globals.css` stays for plain transitions.

## 12. States, words and honesty

### Every data view has four states

| State | Pattern | Example |
| --- | --- | --- |
| Loading | Name what is loading; use a skeleton only where the layout is known | "Loading reports near Bukit Raja…" |
| Empty | Why it is empty and the one action that fills it | "No reports in this area yet. Spot a problem? Report it." |
| Error | What failed and what to do; keep any data already loaded, but mark it as possibly out of date | "Could not refresh. Showing reports from 10:42. Try again" |
| Filtered to nothing | Say the filters are the cause and offer to clear them | "No reports match these filters. Clear filters" |

### Voice

- **Plain, calm and specific.** "Partly blocked" rather than "Partial obstruction impact". "Being checked" rather than "Unverified".
- **Button labels name the action:** "Send report", "Confirm report", "Reject with reason". Never "Submit" or "OK" on their own.
- **No em dashes, no marketing words, no emoji in interface text.**
- **Plan for Bahasa Malaysia from the start:**
  - Keep all strings out of the components.
  - Allow about 30% more length.
  - Use `ms-MY` and `en-MY` date formats.

### Honesty while the data is fictional

The current pages repeat disclaimers in many places, in amber blocks. Replace them with:
1. **A slim, permanent bar on every surface:** "Demo service. Reports are fictional and do not reflect real road conditions."
2. **The verification state on every report.** This is the per-item honesty signal.
3. **An emergency line on the report flow and the About screen:** "For emergencies call 999." A real hazard-reporting service must say this, and it is true in Malaysia.

Several unit tests assert exact disclaimer wording (for example `tests/v211-management-routing.test.ts` and `tests/v213-compact-management-lists.test.ts`). When wording changes, update those tests in the same pull request, and keep the meaning: fictional, unverified, no road status changed.

## 13. Functional gaps the design depends on

The design needs these behaviours, which do not exist yet:

1. ✅ (step 4.3) **Report outcome for residents:** expose a linked incident's status (and the time of the last change) in the public reports API, so "My reports" can show the full lifecycle. Only public fields, never operator notes.
2. ✅ (step 4.3) **"My reports" on the resident website:** store sent report IDs in the browser, as the mobile app already does on the phone.
3. **Clustering** for overlapping markers on both web and mobile.
4. **Reviewer keyboard shortcuts** on the Incidents page.
5. **Localisation plumbing:** a string catalogue in each repository.

## 14. Decisions this direction changes

These were accepted earlier and are replaced here. The owner approved the replacements with this document on 9 November 2026:

| Earlier decision | Replacement |
| --- | --- |
| Blue road hierarchy (`#2563eb` and friends, major roads 3.8 px at 0.58 opacity) always drawn | Overlay hidden by default; thin ink lines in road-inspection mode |
| Emoji hazard markers, tilted 7° | Upright Phosphor glyph pins with fill by verification |
| Teal-800 as the accent for everything | Calm green for actions only; severity colours for hazards only |
| Inter font | Instrument Sans (Atkinson Hyperlegible on 9 Nov; replaced on 10 Nov when Crisp Modern was chosen) |
| Bordered panels on a warm paper background (first proposal, 9 Nov) | Crisp Modern: white cards with soft shadows on a cool off-white page; Night Ops dark mode |
| Simulation on the resident page | Simulation moved to management, under Maps |
| Crisp Modern light theme: shadow-only white cards on `#F6F7F6`, Instrument Sans (10 Nov) | Night Desk: navy top bar and page headers, light work area with hairline-bordered cards, Barlow (21 Nov) |
| Left sidebar navigation | Navy top bar on desktop, bottom tab bar with "More" on phones (21 Nov) |
| Pill-shaped buttons in jade | 10 px buttons: navy for the main action, jade only for Approve (21 Nov) |

## 15. Rollout

Each step is its own pull request with before and after screenshots at 1440 px and 390 px widths. Each PR must also have green CI, a re-run contrast check and an anti-slop review. Web and mobile steps can run in parallel once step 1 is merged.

1. **Tokens only:**
   - Web: colours, fonts and radii in `tailwind.config.ts` and `globals.css`.
   - Mobile: the same values in `src/constants/theme.ts`.

   No layout changes, so every page should still work and simply look calmer.
2. **Shared pieces:** button, status chip, severity marker, lifecycle track, empty/error state, sheet. Add tests for the label and colour mappings.
3. **Map page,** web and mobile. The biggest visible gain.
4. **Report review and overview.**
5. **Resident website restructure,** including the API change from section 13, item 1.
6. **Mobile report flow and My reports.**
7. **Motion pass:** add the animations in section 11, nothing else.

## 16. Open decisions

These are tracked in [roadmap.md](roadmap.md), section 4:

- Product name (G1).
- Background map (G3). Recommended: OpenFreeMap "Positron".
- When to add Bahasa Malaysia (G8).

If the roadmap and section 15 above disagree about order, the roadmap wins. In particular, the website comes first and the mobile steps wait (roadmap section 3A).
