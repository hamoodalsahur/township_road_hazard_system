# Way home: test pack for your own area (roadmap 6.5)

A checklist for trying "Your way home" around where you actually live, with a **fictional** closure.
Your home and your area stay on your PC: never write coordinates into Git, pull requests, these notes or screenshots you share.

## 1. One-time setup

1. Get a free OpenRouteService key: create a HeiGIT account at account.heigit.org (OpenRouteService is run by HeiGIT), open the dashboard and copy the key under tokens. The free Standard plan is enough. New keys are long and may start with "eyJ"; that is normal.
2. Back up `.env` (`Copy-Item .env backup\.env.before-way-home`), then add this line to `.env`:
   ```
   OPENROUTESERVICE_API_KEY="<your key>"
   ```
3. Restart `npm run dev`. Never commit `.env` or paste the key anywhere else.

Without the key, the card says the way-home check is not set up; nothing else changes.

## 2. Set your home

1. Open `/resident`. The card says "Check your way home". Press **Set my home**.
2. Drag the map so the house pin sits on your home (or press **Use my location**), then **Next**.
3. Choose where checks start:
   - **Where I am**: asks your browser for your location each time you check.
   - **A usual starting place**: for example campus; you place it on the map.
4. **Save**. You are back on the map, and the card checks the route.

## 3. Checklist

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Open `/resident` with no closures on your route | "Your way home is clear", with minutes and km; the route drawn solid |
| 2 | Send a fictional report near a road on your usual route, approve it in Incidents, then **Close roads…** on that road for 2 hours | Within a minute (or after **Check again**): "Your way home is affected", the closure named, the detour in blue, the usual way dotted, the extra minutes |
| 3 | Look at the detour | It does not use the closed road |
| 4 | In Incidents → Road closures, **End closure now** | After **Check again**: back to "clear" |
| 5 | Close every road around your home for a moment | "No way home found around the closure" (then end that closure) |
| 6 | Switch the start to **Where I am** and deny location in the browser | The card says location is turned off; nothing is sent |
| 7 | Press **Check again** more than 10 times in a minute | "Too many checks in a minute"; it works again a minute later |
| 8 | Remove your home (Set my home → **Remove my home from this browser**) | The card goes back to "Check your way home" |
| 9 | Open the site in another browser | No home there: it is kept per browser only |

## 4. Privacy, in short

- Your home and start are kept in this browser only (`laluan.wayHome.v1`, rounded to about 1 m).
- To work out a route, the start and home points are sent to OpenRouteService for that one answer. This app does not store or log them; the request uses POST, so they never appear in web addresses or the dev server log.
- Clearing your browser data removes the home pin.

## 5. Troubleshooting

| Message | Meaning |
| --- | --- |
| "Way home is not set up on this server yet" | No `OPENROUTESERVICE_API_KEY` in `.env`, or the dev server was not restarted |
| "The OpenRouteService key was refused" | The key is wrong or was revoked |
| "Today's free route allowance is used up" | The free plan's daily limit; try tomorrow |
| "The route service did not answer" | No internet, or OpenRouteService is down |
| "No route found" | OpenRouteService has no road between the two points |
