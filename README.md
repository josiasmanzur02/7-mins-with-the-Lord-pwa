# 7 Minutes with the Lord

Express + EJS web app (PWA-ready) for guided 7‑minute devotion times with local, device-only data (settings, streak) stored in IndexedDB.

## Run it locally
1. Install dependencies: `npm install`
2. Start in dev mode (auto-reload): `npm run dev`
   - or production: `npm start`
3. App runs at `http://localhost:3000`
4. All user data lives in the browser (IndexedDB). No signup/login is required.

## GitHub Pages build
- Generate the static site with `npm run build`
- The built output is written to `docs/`
- This branch is set up for GitHub Pages from the `github-pages-static` branch and the `/docs` folder
- The static build publishes localized routes at `/en/home/`, `/en/timer/`, `/en/settings/`, `/en/install/` and matching `/es/...` routes

## Data model (client-side)
- Stored in IndexedDB `sevenMinutes` ➜ store `appState` (singleton record).
- Fields: `settings` (theme, language, sound enabled/volume), `streak` (count, lastCheckDate), `logs` (recent sessions), `schemaVersion`.
- Import/Export JSON available in Settings; Reset clears local data on the device.

## Key features
- Guided 7-step timer with per-step verses and soft pings + finish chime (toggled in Settings)
- Streak tracking stored locally with daily check-in logic
- Settings for light/dark theme, language (en/es), and sounds
- Import/Export/Reset local data
- PWA: manifest + service worker so it can be “installed” on iOS/Android (Add to Home Screen)
- Offline: service worker precaches core pages/assets (home, timer, settings, install, JS/CSS) and uses local font fallbacks so the timer works without a connection.
- Install instructions page at `/en/install/` and `/es/install/`

## Verses and copyright
Short verse snippets are from the public-domain KJV. Each step links to the Recovery Version site for full text. To comply with Living Stream Ministry’s policy, keep snippets short and use links for full passages.

## Mobile install
- iOS (Safari): Share ➜ Add to Home Screen
- Android (Chrome): ⋮ menu ➜ Install app / Add to Home screen

## Notes
- Default step durations are defined in `site-data.js` via `getSteps()`.
