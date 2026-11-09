# Development roadmap — Township Road & Hazard Intelligence System

> **University fictional demonstration only (verified against code merged through 22 October 2026).** No operational road-safety, emergency dispatch, traffic routing, live hazard, validated geographic accessibility or confirmed closures. Local map geometry is OSM-derived and **unverified**; semantic AI is advisory and never changes incident/road status.

## Implemented and previously locally tested

| Milestone | Implemented capability | Verified scope and limits |
| --- | --- | --- |
| V1 setup / simulation | Next.js, Prisma SQLite, schematic graph, five-stage fictional flood simulation, connectivity demonstration and basic reports | Schematic coordinates/statuses represent **fictional examples**. Connectivity is not actual drivable routing. |
| V2 geographic reporting | Resident map/report submissions, locally imported BBR OSM reference lines, seven fictional hazard categories | User's tracked `public/data/bbr-roads.geojson` is locally modified and can differ from GitHub; never overwrite/import without permission. |
| V2 evidence/privacy | One sample photo per report, private operator inspection, explicit separate public-demo approval | Never use real identifying photos for tests. No production image scanning, secure storage or retention system. |
| V2 AI research | Optional local Ollama similarity triage, bilingual synthetic evaluation workbench, thresholds and CSV evaluation | AI suggestions are advisory; limited authored test cases do not establish real-world accuracy or fairness. |
| V2.5 incident management | Human-created `DemoIncident` groups, explicit link/unlink/status change with operator reason and audit | One linked group per report, rejected reports cannot remain grouped, no status change on `RoadSegment` from geographic/AI output. |
| V2.6 oversight / QA | Incident oversight, read-only fictional consistency checks, research metadata CSV export | Dashboard metrics are descriptive, not incident severity; report descriptions, photo contents, review notes and coordinates are excluded from CSV. Operator-authored incident titles may need review before sharing. |
| V2.6 geographic QA | Read-only nearby unverified OSM road candidates, source node topology audit | Proximity/shared node IDs do not prove road associations, legal junctions, accessibility, or safe routes. |
| V2.7 intake / tag diagnostics | Actual streamed JSON byte limits on demo intake; read-only OSM one-way/access/bridge/tunnel/layer summary | Local-development-only intake, not rate limiting, public authentication, or an authoritative OSM road model. |
| V2.8 provenance / privacy | Raw unverified candidate-tag caveats and metadata-only private evidence inventory with age indicators | Evidence inventory does not retrieve photos or perform deletion/publication. Age count is **not** a retention policy. |

The implementations above are merged in `main` through PR #54 and were confirmed by the user in combined local sessions. The merged V2.8 tree matched the tested integration tree; always recheck GitHub before further merges.

## V2.9 proposed, **unmerged / awaiting local approval**

- **PR #56** — read-only review-age queue for unverified fictional reports and under-review grouped incidents; metadata only, no emergency/road priority.
- **PR #57** — SHA-256 digest and coverage summary of the **exact local GeoJSON bytes**; byte equality is not source verification or OSM freshness.
- **PR #58** — temporary combined integration-testing branch for #56–57, **do not merge**.
- **PR #59** — roadmap, acceptance and demo-safety documentation refresh (this PR), also awaiting explicit approval.

Pending PRs can pass CI without user acceptance. **Never merge feature PRs into main before explicit local pass and a successful check on the final reconciled head.**

## Future milestones (planning, not implemented)

1. **Structured, human-reviewed road association research**. Draft distinct candidate / reviewed / rejected states, operator reasons and audit history before new database models. Require independently validated, versioned road identifiers. Do not automate real status changes, closures or safety labels. Any eventual Prisma migration requires a **backed-up** local database and explicit user approval; never seed/reset existing data.
2. **Source integrity and richer topology validation**. Research OSM access restrictions, turn relations, one-way direction, bridges/layers and independently verified road identity. No routing or authoritative conclusions from raw OSM tags.
3. **Production security and privacy design**, separately gated: true authentication and role separation, storage scanning/transcoding, upload quota/rate limits, photo consent/revocation, retention safeguards and deployment restrictions. Current demo operator key is not real production login.
4. **End-to-end evaluation and academic methodology**. Reproducible fictional data fixtures, safety/regression tests, documented limitations and demo outcomes; distinguish development-tuned from untouched holdout evaluation.
5. **Deployment is NOT currently approved.** Requires verified data sources and domain review before anything could be interpreted as live public hazard information.

## Team workflow and local protection rules

1. Always start feature branches from the verified current `main`; use separate PRs and incremental commits.
2. Require CI (unit tests, TypeScript, build), then a dedicated integration branch for convenient combined local tests.
3. Before switching branches, stop the dev server and safely back up local `prisma/dev.db` (including WAL/SHM if present), `public/data/bbr-roads.geojson`, `.env` and local uncommitted work. Use stash carefully.
4. Never run `npm run db:seed`, `npm run geo:import`, `git reset --hard`, destructive schema pushes or force checkout on the user's working data.
5. New groupmate setups use their **own new SQLite DB** and independently configured `.env`, and may seed only disposable fresh DBs. Never share private operator keys, real identifying evidence or the user's DB.
6. Merge approved original PRs separately with conflict reconciliation. Validate final `main` tree against tested integration tree and await post-merge CI. Close temporary testing PRs without merging them.
