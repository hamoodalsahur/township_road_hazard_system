# How the project fits together

We have two views of the same system: one for residents and one for township management. They both use the same database and APIs, so we don't have to maintain two separate sets of road information.

## The flow

**Resident:** opens the map, checks the details of a fictional zone or road, explores the demo scenario, and can submit a test incident report.

**Management:** views the same network, checks scenario changes, and reviews those test reports. Review decisions don't automatically close roads.

**Presenter:** resets the five-stage simulation and advances it while showing the changes on both pages.

## What we're using

| Part | Technology | Why |
| --- | --- | --- |
| Website | Next.js, React, TypeScript and Tailwind | One project for both interfaces |
| Map | Leaflet with `CRS.Simple` | Interactive schematic network, not actual GPS locations |
| Database | Prisma and Postgres 16 in Docker (since 22 Nov 2026; SQLite before) | Saves roads, zones, scenario history and reports locally. See `docs/database.md` |
| Backend | Next.js API routes | Reads and updates the shared data |
| Risk logic | Rules written in TypeScript | Explains the result of each fictional stage |
| Network analysis | Graph traversal | Checks connections in the test graph, without claiming road safety |
| Tests | Node test runner through `tsx` | Checks the most important rules |

## What isn't finished

We still need verified geographic data, authenticated operator actions, stronger audit records and proper deployment restrictions. We don't have real-time sensors, a validated flood prediction model or real road navigation.

## Rules we're keeping

- Label simulated, historical and live information separately.
- Don't turn a resident report into a confirmed road closure automatically.
- Keep outdated road conditions marked unknown.
- Never assume a theoretical graph connection means it's safe to travel.
- Check BBR locations and any proposed staging spots before showing them as real.
