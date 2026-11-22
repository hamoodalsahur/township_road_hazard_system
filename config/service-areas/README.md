# Service areas

The area where the system accepts reports (and later road closures). Roadmap step 2.1.

- `bbr.geojson`: Bandar Bukit Raja, the default. Committed.
- `local.example.geojson`: a template for your own test area.
- Any other `.geojson` here (for example `local.geojson`) is **ignored by Git**, so an area around your home never reaches GitHub.

To use your own area:

1. Copy `local.example.geojson` to `local.geojson` and change the corners. Points are `[longitude, latitude]`, and the last point repeats the first. The area must be under 60 km across. Tools like geojson.io can draw the polygon for you.
2. Add `SERVICE_AREA="local"` to `.env`.
3. Download the road lines for your area: `npm run geo:import-area`. They go to `public/data/roads/local.geojson`, which is also ignored by Git. The BBR road file is never touched. Use `-- --replace` to download again later (the old file is kept in `backup/`).
4. Restart `npm run dev`.

System & Audit shows which area is active. If the file has a mistake, the app falls back to BBR and says why there.

The area decides where reports are accepted, where maps start, and which road file the maps and road checks use. Reports from an earlier area stay in the database and in Incidents, but the Overview map only draws the ones inside the active area. Routing for whole trips comes with phase 6.

To go back to BBR, remove the `SERVICE_AREA` line (or set it to `"bbr"`) and restart.
