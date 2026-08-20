# LiftLog

A lightweight, offline-first workout tracker PWA. No frameworks, no build step — plain HTML/CSS/JS.

## Features
- Routine builder: search/filter exercises, group by muscle, set per-exercise sets/reps targets, drag to reorder
- Live workout logging with per-set rest timers, superset marking, and exercise substitutions
- Dashboard: weekly volume chart, training frequency, recent PRs
- Performance tab: PR volume, best set, weekly/monthly volume, estimated 1RM, 6–8RM range with a strength-trend chart showing the shaded 6–8RM band
- Progression recommendations targeting the 6–8 rep range
- History log, JSON export/import backup, and local-only data (nothing leaves your device)
- Installable PWA with offline support and automatic update detection

## Files
- `index.html` — markup
- `styles.css` — all styling
- `app.js` — all app logic
- `sw.js` — service worker (offline caching + auto-update)
- `manifest.webmanifest` — PWA install metadata
- `icon-192.png` — app icon

## Deploying
Push to the repo's default branch; GitHub Pages redeploys automatically. Bump the version badge in `index.html` and the `CACHE` name in `sw.js` together with each release so installed devices pick up the update.

## Local development
No build step. Serve the folder locally (e.g. `npx serve .`) and open it in a browser — `file://` won't work correctly with the service worker/manifest.
