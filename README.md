# 7 Minutes with the Lord

Express + EJS web app (PWA-ready) for guided 7‑minute devotion times with streak tracking.

## Run it locally
1. Install dependencies: `npm install`
2. Start in dev mode (auto-reload): `npm run dev`
   - or production: `npm start`
3. App runs at http://localhost:3000

The first run creates `data/app.db` and `data/sessions.sqlite` automatically and applies `data/schema.sql`.

## Database schema
SQL to initialize tables lives in `data/schema.sql`. To rebuild manually:
```bash
sqlite3 data/app.db < data/schema.sql
```

### Tables
- `users`: auth, theme/language preferences, streak counters
- `devotions`: per-session log (date, segments_completed)
- `sessions.sqlite`: session store for Express (created by connect-sqlite3)

## Key features
- Email/password auth with bcrypt
- Streak tracking with daily check-in logic
- Guided 7-step timer with per-step verses and a soft ping sound
- Pause/back/exit controls on the timer
- Settings for light/dark theme and language (en/es placeholder)
- PWA: manifest + service worker so it can be “installed” on iOS/Android (Add to Home Screen)
- Install instructions page at `/install`

## Verses and copyright
Short verse snippets are from the public-domain KJV. Each step links to the Recovery Version site for full text. To comply with Living Stream Ministry’s policy, keep snippets short and use links for full passages.

## Mobile install
- iOS (Safari): Share ➜ Add to Home Screen
- Android (Chrome): ⋮ menu ➜ Install app / Add to Home screen

## Notes
- Session secret: set `SESSION_SECRET` in env for production.
- Default step durations are 60s each; adjust in `server.js` (the `steps` array) or enhance the UI to make them user-editable.
