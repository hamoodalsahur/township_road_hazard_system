# Design direction

**Status:** proposal, waiting for owner approval. Nothing in the code follows this yet.
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

- **Neutrals** carry the interface.
- **Green** marks actions, selection and focus.
- **The severity scale** is for hazards only.

Nothing else gets a colour.

### Light theme

| Token | Hex | Use | Why |
| --- | --- | --- | --- |
| `paper` | `#F5F3EE` | Page background, map surround | Warm off-white reads like a paper map and is less clinical than grey-blue |
| `surface` | `#FFFFFF` | Panels, cards, inputs | Content sits on clean white |
| `sunken` | `#ECE9E2` | Wells, table headers, read-only fields | Recessed without needing a border |
| `line` | `#DDD8CE` | Dividers, card borders | Structure without weight |
| `field` | `#8A8478` | Input and checkbox borders | Meets 3:1 for interactive boundaries |
| `ink` | `#1B2420` | Main text | Near-black with a green cast, so it matches the brand green |
| `muted` | `#4F5853` | Secondary text | Readable on every background |
| `subtle` | `#5C6560` | Hints, timestamps | Lightest text allowed, still AA on every background |
| `green` | `#17573F` | Primary buttons, links, selection, focus ring | Echoes Malaysian expressway sign green, a local "go and trust" colour, without the generic SaaS teal |
| `green-hover` | `#124733` | Hover and pressed state for green | Darker, not lighter, so text contrast rises |
| `green-tint` / `green-text` | `#E5EFEA` / `#0F3F2D` | Selected rows, active tab background | Selection without shouting |

### Severity scale (hazards only)

Maps to the stored `impact` value. Each step has a solid colour (markers), a tint (backgrounds) and a text colour for use on the tint.

| Impact | Label | Solid | Tint | Text on tint | Glyph colour on solid |
| --- | --- | --- | --- | --- | --- |
| `suspected_closure` | Possibly closed | `#B42318` | `#FCEBE8` | `#8F1C13` | white |
| `partial_obstruction` | Partly blocked | `#B9480F` | `#FDEEE3` | `#8A3509` | white |
| `caution` | Take care | `#F2B42C` | `#FDF4DC` | `#7A5100` | `ink` |
| `unknown` | Not sure | `#68716C` | `#ECEDEA` | `#47504B` | white |

Every marker has a thin outline in `ink` at 70% opacity. Without it, the amber marker measures only 1.67:1 against `paper` and disappears on light map areas.

### Dark theme

This is required on mobile, which follows the phone's setting. The management website can stay light-only in the first phase.

| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| `paper` | `#111513` | | `green` | `#6CC79D` (text on it: `#0B1F17`) |
| `surface` | `#191E1B` | | `green-tint` / text | `#18342A` / `#A8E3C7` |
| `sunken` | `#0C0F0D` | | severity solids | `#F2867A`, `#F3A066`, `#F2C04C`, `#A3ABA6` |
| `line` | `#2D3430` | | `ink` / `muted` / `subtle` | `#ECEFEA` / `#B3BBB5` / `#9AA39C` |
| `field` | `#7C857F` | | | |

### Contrast check

Every text and background pair above was checked with a script against WCAG AA: 4.5:1 for text, and 3:1 for input borders and map markers. All pairs pass. The lowest is `subtle` on `sunken` at 4.97:1. Re-run the check whenever a token changes.

### Rules

- **No gradients, glows or glass.** Nothing here needs them.
- **Green is never used for status.** "Confirmed" is shown with the lifecycle track and a check glyph in `ink`, so green keeps meaning "you can act here".
- **Severity colours never appear on buttons, headings or decoration.**

## 6. Typography

| Role | Family | Why |
| --- | --- | --- |
| Everything | **Atkinson Hyperlegible Next** (Braille Institute, OFL licence) | Designed so similar letters (I, l, 1, O, 0) stay distinct for low-vision readers. That fits a safety tool read on small screens in bad conditions, and it gives the product a recognisable voice that is not one of the AI-default fonts. |
| Coordinates, report IDs, times in tables | **Atkinson Hyperlegible Mono** | Same family, fixed width, so numbers line up in columns |

Packages, all checked on npm:
- **Web:** `@fontsource/atkinson-hyperlegible-next`, `@fontsource/atkinson-hyperlegible-mono`
- **Mobile:** `@expo-google-fonts/atkinson-hyperlegible-next`, `@expo-google-fonts/atkinson-hyperlegible-mono`

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
- **Weights:** 400 for text, 600 for labels and buttons, 700 for titles. Nothing heavier.
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

**Known issue from the style tile:** at marker size in the bold weight, `TrafficCone` and `RoadHorizon` look alike, and `CloudLightning` reads as a balloon. Before building the marker component, test alternatives at 18 px on a real phone, for example `Barricade` for roadworks with a different glyph for blocked road, or `Lightning` on its own for storm damage.

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

- **Radius:**
  - **6 px:** inputs and buttons.
  - **12 px:** panels and cards.
  - **20 px:** the top corners of mobile bottom sheets.
  - **Full:** status chips only.

  Three sizes keep the purposes distinct, so a pill always means a status.
- **Spacing:** a 4 px base (4, 8, 12, 16, 24, 32, 48). Use 24 or more between unrelated groups and 8 to 12 inside a group, so whitespace shows grouping.
- **Elevation:**
  - **Shadow** only for layers that float over the map: side sheet, bottom sheet, popovers, map controls.
  - **Borders** for everything else, which sits on the page.

  This works because the map is the only place where a layer can be on top of live content.
- **Touch targets:** 44 × 44 px minimum on every surface, including desktop table actions.

## 9. Layout by surface

### Management website

- **Keep the left sidebar.** It is real navigation across six sections. On narrow screens it becomes a top bar with a menu.
- **Overview, queue first:**
  - The first block is "Needs your decision", listing reports oldest first, with their age and severity.
  - The four stat cards shrink to a single summary line. They are not decisions.
  - The "Quick actions" tiles are removed, because they repeat the sidebar.
- **Incidents:** keep the list-and-detail review layout from #85, which already fits the job.
  - Add the lifecycle track to the detail panel.
  - Move the decision buttons into a fixed footer of the detail panel, so they never scroll away.
  - Keyboard shortcuts: J/K to move through the list, C to corroborate and R to reject. Both decision shortcuts open the reason field first.
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

**Basemap (open decision):**
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

1. **Report outcome for residents:** expose a linked incident's status (and the time of the last change) in the public reports API, so "My reports" can show the full lifecycle. Only public fields, never operator notes.
2. **"My reports" on the resident website:** store sent report IDs in the browser, as the mobile app already does on the phone.
3. **Clustering** for overlapping markers on both web and mobile.
4. **Reviewer keyboard shortcuts** on the Incidents page.
5. **Localisation plumbing:** a string catalogue in each repository.

## 14. Decisions this proposal changes

These were accepted earlier and are replaced here. Each needs the owner's explicit yes:

| Earlier decision | Replacement |
| --- | --- |
| Blue road hierarchy (`#2563eb` and friends, major roads 3.8 px at 0.58 opacity) always drawn | Overlay hidden by default; thin ink lines in road-inspection mode |
| Emoji hazard markers, tilted 7° | Upright Phosphor glyph pins with fill by verification |
| Teal-800 as the accent for everything | Calm green for actions only; severity colours for hazards only |
| Inter font | Atkinson Hyperlegible Next |
| Simulation on the resident page | Simulation moved to management, under Maps |

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

1. Product name (section 4).
2. Basemap provider (section 10).
3. Approve the replaced decisions in section 14.
4. Whether to support Bahasa Malaysia in the first release, or prepare for it and ship English first.
