# Laluan: township road and hazard reports

*"Laluan" (Malay for "route") is a placeholder name, not final. It is set in `src/lib/product.ts`.*

**Sime Darby Property University Hackathon · Bandar Bukit Raja (BBR) · Working prototype**

A multi-hazard road and incident intelligence prototype connecting **resident reporting** with **township management review**. Residents can submit fictional reports, view map markers and report outcomes, while operators can review incidents and manage illustrative evidence and simulation workflows.

> **Hackathon demonstration only.** All incidents and scenarios are fictional. OSM road geometries are unverified reference data, not live road closures, verified road safety information, emergency guidance, or navigation advice.

## Project components

| Component | Link | What it contains |
| --- | --- | --- |
| **Website, backend and management** | **This repository** | Next.js API, local SQLite development data, management dashboard, incident/evidence review, maps and simulation |
| **Resident mobile application** | [township_system_mobile](https://github.com/hamoodalsahur/township_system_mobile) | Expo / React Native app for browsing fictional incident reports, submitting reports and sample photos |
| **Judge-accessible live preview** | [Launch browser demo](https://hamoodalsahur.github.io/township_road_hazard_system/) | Standalone public GitHub Pages simulation, with 1,269 imported BBR road features and fictional incidents |

**Important:** The public browser preview is **not** the hosted Next.js backend. Its demo reviews and incident submissions are browser-only; they do not sync with the actual mobile app or local database.

## How the integrated prototype works

```text
Resident iPhone (Expo app in companion repository)
        |
        | HTTP API via local Wi-Fi (PC IPv4 address, port 3000)
        v
Next.js server (this repository) <----> SQLite development database
        ^
        |
Operator management website on the same local server
```

The two repositories are **linked by API integration**, not a Git submodule or a shared Git history. Both must be run for the full laptop↔iPhone demonstration. Mobile report submissions and sample image reviews have been tested end-to-end in a local development environment.

## Quick start — website and backend

Requires Node.js, npm and Git.

```powershell
git clone https://github.com/hamoodalsahur/township_road_hazard_system.git
cd township_road_hazard_system
npm ci
Copy-Item .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Use `npm run db:seed` **only when intentionally creating a fresh fictional demo database**; do not reseed or reset an existing local database. Never commit `.env`, the private local operator key, SQLite database files, or report photos.

Open:
- **Management:** `http://localhost:3000/management`
- **Resident website:** `http://localhost:3000/resident`
- **Browser preview:** [Public judge demo](https://hamoodalsahur.github.io/township_road_hazard_system/)

For local operator demo login, configure your private `DEMO_OPERATOR_KEY` in `.env`, then use that key on the management sign-in screen. This is a **development-only** control, not production authentication. Follow [operator setup](docs/operator-demo.md).

## Connect the iPhone app

1. Clone the [mobile app repository](https://github.com/hamoodalsahur/township_system_mobile) in another folder and run `npm ci`, then `npx expo start`.
2. Run this repository's Next.js server on your PC (port `3000`).
3. Keep the PC and iPhone on the **same trusted Wi-Fi**.
4. In the mobile app go to **About → Local Backend** and enter `http://<PC-WIFI-IPv4>:3000` using the PC's actual Wi-Fi adapter address, **not** `localhost`.
5. Submit a clearly fictional sample incident in the mobile app; review it from the management website.

The real SQLite database, uncommitted local road data, and private photos are **not automatically transferred by cloning**. The public judge preview bundles its own road GeoJSON at `judge-demo/assets/bbr-roads.geojson`; the local app's original `public/data/bbr-roads.geojson` may require separate setup.

## Features

- BBR geographic reference roads and incident markers
- Multi-hazard fictional reporting, including floods, potholes, fallen trees and construction disruptions
- Management incident review with separate controls for publishing sample evidence photos
- Demo flood and road-condition scenarios and road topology/research utilities
- Companion iPhone reporting and photo workflow
- Browser-only judge preview requiring no local software installation

## Validation and scope

For code checks after installation:

```powershell
npm test
npm run typecheck
npm run build
```

The GitHub Actions workflow runs the website checks on pull requests. This project is a **prototype**: it does not provide live hazard feeds, verified road availability, autonomous emergency routing or production-grade security.

## Documentation

- [Mobile setup and workflow](https://github.com/hamoodalsahur/township_system_mobile#readme)
- [Local operator demo setup](docs/operator-demo.md)
- [Architecture and scope](docs/architecture.md)
- [Road source register](docs/source-register.md)
- [Data handling notes](docs/data-integrity.md)
- [Roadmap](docs/roadmap.md)
- [Public judge-demo notes](judge-demo/README.md)
