# Service areas

The area where the system accepts reports (and later road closures). Roadmap step 2.1.

- `bbr.geojson`: Bandar Bukit Raja, the default. Committed.
- `local.example.geojson`: a template for your own test area.
- Any other `.geojson` here (for example `local.geojson`) is **ignored by Git**, so an area around your home never reaches GitHub.

To use your own area:

1. Copy `local.example.geojson` to `local.geojson` and change the corners. Points are `[longitude, latitude]`, and the last point repeats the first. The area must be under 60 km across. Tools like geojson.io can draw the polygon for you.
2. Add `SERVICE_AREA=local` to `.env`.
3. Restart `npm run dev`.

System & Audit shows which area is active. If the file has a mistake, the app falls back to BBR and says why there.

The area only decides where reports are accepted and where maps start. Road lines for a new area come with roadmap step 2.3, and routing for whole trips comes with phase 6.
