# Demo day checklist

Everything runs on your laptop. The phone talks to it over Wi-Fi or your iPhone's Personal Hotspot. No internet hosting is involved.

## The evening before (10 minutes)

1. Website folder: stop `npm run dev`, then `git pull` and `npm run db:migrate`. This also rebuilds the Prisma client.
2. Phone app folder: `git checkout main`, `git pull`, then `npm ci` (only needed if `package.json` changed).
3. Run the whole story once (below), then end the practice closures in **Incidents → Road closures**.

## On the day, before you present

1. Start Docker Desktop (Postgres).
2. Connect the laptop to your **iPhone's Personal Hotspot**. Campus Wi-Fi often blocks phone-to-laptop traffic.
3. Website folder: `npm run dev`.
4. Optional: `npm run demo:prepare` to see what it would do, then `npm run demo:prepare -- --apply` to add the fictional demo reports. Run it within 6 hours of presenting, because its sample closure ends after 6 hours.
5. Get the laptop's address in PowerShell: `(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress`. Don't use the **Network** line `npm run dev` prints; it can be a virtual adapter.
6. Phone app folder: `npx expo start -c`. Scan the QR code with the iPhone camera.
7. In the app, go to **Settings**, enter `http://<address>:3000` and tap **Check and save**. It should say "Connected to My area".
8. Open the operator desk on the laptop and sign in. A refresh keeps you signed in for that tab.

## The story (about 5 minutes)

1. **Phone, Map:** your area, its pins, and the way-home card saying **Your way home is clear**.
2. **Phone, Report:** report a fallen tree on your route as **Possibly closed**: tap the spot, add a few words, then **Send report**. **My reports** shows *Being checked*.
3. **Laptop, Incidents:** open the report and approve it. **Close roads** opens with the nearest road picked. Check the road is on the route, then press **Close 1 road**.
4. **Phone:** within a minute (or pull to refresh), the map shows the closed road in red and the card says **Your way home is affected**, with the blue detour. **My reports** shows *Confirmed*.
5. **Laptop:** on the same report, press **Road cleared…**, then **Mark cleared**.
6. **Phone:** the closure disappears, the card says **clear** again, and **My reports** shows *Resolved*.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "Some roads are not in the database" when closing a road | `npm run db:import-roads` in a second terminal, then reload the page |
| The reports list errors ("Reports are unavailable") | Is Docker running? Then stop `npm run dev`, run `npm run db:migrate`, and start it again |
| The phone says it could not reach the laptop | Same hotspot or Wi-Fi? Laptop address changed? Check `http://<address>:3000/resident` in Safari. Windows Firewall: set the network to **Private** |
| Expo Go says the project is incompatible | Update Expo Go and the app's packages (`git pull`, `npm ci`). The app is on SDK 58 |
| Red error screen on the phone | `npx expo start -c` (clears the cache) and scan again |
| No detour drawn | The closed road must be on the route for at least 25 m. Close the whole segment under the blue line |

**Never run** `npm run db:push`, `prisma migrate reset`, `docker compose down -v` or `npm run geo:import` on your laptop.
