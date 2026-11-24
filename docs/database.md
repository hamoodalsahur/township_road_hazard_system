# Database: Postgres in Docker

Since 22 November 2026 (roadmap step 2.2) the app stores its data in **Postgres 16**, running in Docker on your own PC (`docker-compose.yml`). The old SQLite file `prisma/dev.db` is kept as a **read-only archive**; nothing in the project writes to it any more.

## Everyday use

| What | Command |
| --- | --- |
| Start the database (Docker Desktop must be open) | `npm run db:up` |
| Check it is running ("healthy") | `docker compose ps` |
| Stop it (data is kept) | `npm run db:down` |
| Apply new migrations after a `git pull` (stop `npm run dev` first; it also rebuilds the Prisma client) | `npm run db:migrate` |
| Browse the data | `npm run db:studio` |
| Copy your area's road lines into the database | `npm run db:import-roads` |

Postgres listens on `127.0.0.1:5432` only: reachable from this PC, not from your Wi-Fi network. The password is `POSTGRES_PASSWORD` in `.env`, and the same password is inside `DATABASE_URL`. Use letters and digits only.

## Moving from the old SQLite file (once)

1. Stop the dev server. Back up `.env`: `Copy-Item .env backup\.env.before-postgres`
2. `git checkout main`, `git pull`, `npm install`
3. Make a password (letters and digits): ``-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})``
4. In `.env`, put `# ` in front of the old `DATABASE_URL="file:./dev.db"` line (keep it for undoing), then add:
   ```
   POSTGRES_PASSWORD="<the password>"
   DATABASE_URL="postgresql://laluan:<the password>@127.0.0.1:5432/laluan?schema=public"
   ```
5. `npm run db:up`, then `docker compose ps` until it says `healthy`
6. `npm run db:migrate` (creates the empty tables)
7. `npm run db:copy-from-sqlite -- --dry-run` and check the counts look like your data
8. `npm run db:copy-from-sqlite` and look for "every table matches the snapshot"
9. `npm run dev` and check Overview, Incidents and Evidence show what you had before

What the copy does, and never does:
- It first copies `prisma/dev.db` (and `dev.db-wal`, `dev.db-shm`) into `backup/sqlite-snapshot-<time>/` and reads only that copy. Your original file is never opened, changed or deleted.
- It refuses to run unless every Postgres table is empty, so it can never overwrite or mix data. Do **not** run `npm run db:seed` before copying.
- It copies everything in one transaction (all or nothing), keeping the same ids and dates, then compares counts and ids table by table.

## Road lines in the database (step 2.3)

Since 23 November 2026 the maps and the road checks read road lines from the `road_lines` table. `npm run db:import-roads` fills it from the active area's GeoJSON file (`SERVICE_AREA` in `.env`):

1. `npm run db:migrate` once, to create the two road tables.
2. `npm run db:import-roads -- --dry-run` reads the file and shows the line count; it writes nothing.
3. `npm run db:import-roads` copies the lines in. Run it again after downloading new roads; it replaces that area's rows in one transaction.
4. For BBR: `npm run db:import-roads -- --area bbr` reads your local `public/data/bbr-roads.geojson`.

What it does, and never does:
- It only **reads** the GeoJSON file. It never writes, moves or replaces it, including the protected BBR file.
- It touches only the rows for that one area, and records each run in `road_imports` (file, SHA-256 fingerprint, line count).
- Until an area has been imported, the app keeps reading that area's file, exactly as before. The Maps page says which one it used ("read from the database" or "read from the area's file").
- Postgres stores the line properties as JSONB, which may reorder keys inside each line. The lines, their order and every value are unchanged.

## Getting ready to present (`npm run demo:prepare`)

1. `npm run demo:prepare` shows the plan and changes nothing.
2. `npm run demo:prepare -- --apply`:
   - archives reports outside your active area (for example the old BBR ones) by marking them `archived_other_area`. Nothing is deleted; they just stop appearing;
   - adds one small fictional set on your own road lines: two approved reports (one with a 6-hour road closure, one in a group), three waiting, one rejected. It never adds a second set.
3. Undo the archiving: `npm run demo:prepare -- --restore`. The new ids are saved in `backup/demo-seed-<time>.json`.

## Undo

Stop the dev server, put the old line back in `.env` (`DATABASE_URL="file:./dev.db"`, remove the Postgres one) and check out a commit from before step 2.2 (`git checkout 720648c`). `dev.db` is exactly as it was. To return to Postgres, check out `main` again and restore the Postgres line; the data in Docker is still there.

## Never do these (they delete data)

- `docker compose down -v` (the `-v` deletes the database volume). Plain `docker compose down` or `npm run db:down` is fine.
- `npx prisma migrate reset`, `npx prisma db push --force-reset`, or deleting the `laluan-pgdata` volume in Docker Desktop.
- If Prisma ever asks "Do you want to continue? All data will be lost", answer **no** and ask first.

## Changing the database structure (developers)

Edit `prisma/schema.prisma`, then `npm run db:migrate:new -- --name what_changed` to create a migration file without applying it, review the SQL, commit it, and apply it with `npm run db:migrate`. Keep `prisma/sqlite-legacy/schema.prisma` unchanged; it only describes the old file for the copy script (a test checks it still matches the tables that existed in SQLite). Tables added later, such as the road tables, go after them in `schema.prisma` and are not copied.

## PostGIS later

PostGIS (map functions for whole-trip routing, phase 6) is not installed yet on purpose: its Docker image adds a `spatial_ref_sys` table that Prisma reports as drift and offers to reset the database for. It will be added with Prisma's extension support when routing needs it; the data volume carries over.

## Troubleshooting

- **`Set POSTGRES_PASSWORD in .env first`**: the password line is missing from `.env`.
- **`Can't reach database server at 127.0.0.1:5432`**: Docker Desktop is closed or the container is stopped. Run `npm run db:up`.
- **`port is already allocated`**: another Postgres is using 5432. Stop it, or tell Claude to move this one to another port.
- **`password authentication failed`**: the password in `DATABASE_URL` differs from `POSTGRES_PASSWORD`. The database keeps the password it was first created with; ask before changing it.
