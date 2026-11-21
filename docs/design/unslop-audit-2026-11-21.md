# Design audit: Overview and Incidents (21 November 2026)

First run of the unslop skill (`.claude/skills/unslop`) in **polish mode**, with `docs/DESIGN.md` as the brand. Read-only: nothing was changed in this audit.

- **Screens:** management Overview and Incidents (report review and incident groups), plus the shared shell, chips and markers.
- **Method:**
  - Went through the skill's checklist (`references/signs.md`) against the code.
  - Looked at the screenshots taken on 10 November; the code is unchanged since.
  - Counted sizes, weights, spacing steps and icon sizes across the files.
- **Verdict:** light slop, so polish mode, no new direction. The screens are already designed. Most of what's left is inconsistency with our own `DESIGN.md`, not "AI look".

## A. Breaks our own DESIGN.md (fix, no decision needed)

| # | Finding | Where | Fix |
| --- | --- | --- | --- |
| A1 | Text below the 13 px minimum. `text-xs` (12 px) is used 16 times, and the keyboard keycaps are 11 px. | Footers, hints, counts, keycaps | 13 px (Caption). Keycaps 13 px mono. |
| A2 | Sizes that are not on our scale: 15 px (20 uses), 17 px (shell product name), 20 px (3 uses). In total 11 different sizes across these screens. | Summary lines, empty states, card titles | Use only the scale: 32 / 24 / 18 / 16 / 14 / 13. Reading text such as report descriptions in the detail panel is 16. |
| A3 | Spacing off the 4 px base: 6, 10 and 14 px steps (`gap-1.5`, `gap-2.5`, `p-3.5` and similar), about 70 uses. | Rows, chips, buttons, panels | 4 / 8 / 12 / 16 / 24 steps. Gaps inside a group 8 to 12, between groups 24 or more. |
| A4 | Icons in 16 sizes (11 to 28 px in the interface, markers aside). | Everywhere | 16 px inline with text, 20 px in navigation and section headers. Markers keep their own sizes. |
| A5 | Single short sentences ending in a full stop, for example "No reports yet." and "No strong matches found." (about 8). | Empty states, hints | No full stop on one-line captions and empty states. Messages of several sentences keep theirs. |
| A6 | Text inputs are pills, but `DESIGN.md` says inputs are 10 px (pills are for buttons, search, filter and status chips). The approved mockups showed the reason box as a pill. | Reason for decision, operator justification | Owner's call: follow the doc (10 px) or update the doc to say decision inputs are pills. |

## B. Where unslop disagrees with our approved design (owner decides)

| # | unslop says | Our design says | Suggestion |
| --- | --- | --- | --- |
| B1 | Weights 400 and 500, with 600 only for rare emphasis | 600 for labels, buttons and titles (61 uses) | Keep 600 for titles and buttons. Consider 500 for chips and filter labels so titles stand out more. |
| B2 | Not everything a pill | Pills for buttons, search, filter and status chips | Keep ours. Cards and panels are already 18 and 24 px, not pills. |
| B3 | One accent, used rarely | Green for actions, selection and focus | Keep ours, but make the "OP" avatar neutral (grey), since green there is decoration. |

## C. Already fine (no slop found)

- No gradients, glows, coloured shadows or colour blobs.
- No emoji. One icon set (Phosphor), and the hazard glyphs are fixed per category.
- Sentence case, and no uppercase tracked labels on these screens.
- No exclamation marks, hype words or greeting headlines. Search placeholders are short.
- Quiet chrome and loud hazards: the hazard markers and severity chips are the only rich colour, which is the skill's "one bright element".
- Times and IDs are in mono, so numbers line up.
- Motion has a purpose: colour and shadow changes on hover, and a pulse only on the loading placeholder.
- The Overview has one clear main block ("Needs your decision"), with smaller lists beside it.
- **Template check passes:** the hazard pins, lifecycle track and wait times would not fit another product.

## Not covered

- Maps & Simulation, Evidence, AI & Research and System & Audit are not rebuilt yet and still use the hackathon styles. Each gets this audit when it is rebuilt.
- The resident website and the mobile app.
