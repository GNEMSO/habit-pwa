# Daily Habit Log

An installable, offline-first Progressive Web App for tracking daily habits. Built as a standalone static site — no framework, no build step, no accounts, no tracking. Stores data on your device and lets you export/import JSON backups.

## What it does

- Check off daily habits on a Monday-to-Sunday week row; catch-up on past days is allowed.
- See current streak, best streak, and last-30-days count per habit.
- View a 12-week history grid per habit.
- Edit habit names, delete habits (two-step confirmation), and add new habits (max 20).
- Works offline after the first visit (service worker caches the app shell).
- Data persists across restarts and reboots via IndexedDB (with localStorage / in-memory fallbacks).
- Export and import backups as JSON (Web Share with file, download, or copy fallback).
- Installable: iPhone "Add to Home Screen", Mac "Add to Dock", Chrome/Edge install button.

## File tree

```
habit-pwa/
  index.html
  manifest.webmanifest
  sw.js
  _headers
  css/
    tokens.css
    app.css
  js/
    app.js
    dates.js
    stats.js
    reducer.js
    store.js
    render.js
    backup.js
    pwa.js
  fonts/
    (empty — system font stack used; see NOTES.md)
  icons/
    icon.svg
    icon-192.png
    icon-512.png
    icon-maskable-512.png
    apple-touch-icon-180.png
    favicon-32.png
  tests/
    dates.test.js
    stats.test.js
    reducer.test.js
    backup.test.js
  tools/
    list-assets.mjs
    make-icons.mjs          (dev-only icon generator; not shipped)
  docs/                     (this handoff pack)
  README.md
  NOTES.md
```

## How to run locally

Serve the folder with any static static server (do not open `index.html` as `file://` — service workers and ES modules need HTTP):

```bash
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080`. In DevTools > Application > Service Workers, enable "Update on reload" while developing, then disable it when testing real update behavior.

## How to run the tests

Unit tests use Node's built-in test runner (no dependencies). Run under all three time zones:

```bash
TZ=UTC node --test tests/
TZ=Asia/Phnom_Penh node --test tests/
TZ=America/New_York node --test tests/
```

## How to deploy

The site is fully static and deploys with no build step to any static host (Vercel, Cloudflare Pages, Netlify, GitHub Pages, etc.).

1. Push the folder to a Git repository.
2. Connect it to your host (Vercel default). Framework preset: None, no build command, publish/output directory = repository root.
3. Make sure `sw.js`, `index.html`, and `manifest.webmanifest` are served with `Cache-Control: no-cache`. The included `vercel.json` handles this on Vercel; `_headers` does the same for Cloudflare Pages and Netlify.
4. All URLs are relative (`./`), so the app works at a domain root or under a subpath (e.g. GitHub Pages project sites).

### Vercel (`vercel.json`)

A `vercel.json` is included at the project root. It sets:
- `no-cache` on `sw.js`, `index.html`, `manifest.webmanifest` (so the service worker and shell always revalidate).
- immutable, long-lived caching on `icons/`, `css/`, `js/`.
- `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` globally.

If you add or remove shipped files, bump `VERSION` in `sw.js` and regenerate the precache list with `node tools/list-assets.mjs`.

### Release process

1. Make your changes.
2. Bump `VERSION` in `sw.js` (for example `v1` → `v2`) whenever any shipped file changes.
3. If you added or removed files, regenerate the precache list: `node tools/list-assets.mjs` and paste the output into the `ASSETS` array in `sw.js`.
4. Run `TZ=UTC node --test tests/` (and the other time zones).
5. Commit and push (or redeploy).
6. Open the deployed URL, wait for the "Update ready. Reload" toast (or reload twice), and confirm the new version.

Forgetting to bump `VERSION` is the most common cause of "I deployed but nothing changed". Never reuse an old version string, because clients holding the old cache would not refresh.

## How to back up and restore data

**Export:** tap "Export backup". The app uses the Web Share API with a file when available (iOS Share sheet), otherwise triggers a download, otherwise shows a Copy button. The file is named `daily-habit-log-YYYY-MM-DD.json`. Exporting records the export date and clears the 14-day backup reminder.

**Import:** tap "Import backup", choose a `.json` file, or tap "Paste backup" and paste JSON. The app validates the file, shows a summary (habits, check-ins, last change), then offers "Merge" or "Replace everything" (Replace requires a second tap on "Replace and cannot undo"). Before any import, the previous state is saved so you can tap "Undo import" (visible until the next change). Invalid files leave your data untouched.

**Backup reminder:** if you have at least 7 check-ins and haven't exported in 14 days, a dismissible "Back up your data" note appears. Dismissing snoozes it for 14 days.

## Installing

**iPhone (Safari):** open the site, tap Share, then "Add to Home Screen". The app is called "Habit Log". Install first, then start tracking — data entered in a Safari tab before installing may not appear in the installed app (they use separate storage contexts on some iOS versions). Use Export/Import to move data if needed.

**Mac (Safari):** File > "Add to Dock". Opens in its own window. Works from narrow to wide sizes (the 560px column centers).

**Mac/Windows (Chrome or Edge):** click the Install icon in the address bar, or use the "Install app" button shown on the page.

## Requirements met

- Plain HTML/CSS/ES modules; no framework, bundler, TypeScript, or runtime npm dependencies.
- No third-party network requests at runtime (no CDNs, no Google Fonts, no analytics).
- All URLs relative (`./`).
- Strict Content-Security-Policy (`default-src 'self'`, etc.).
- Original branding only (icon drawn per the brief, no copied artwork).
- WCAG AA contrast, keyboard operable, screen-reader labels, `prefers-color-scheme` theming, `prefers-reduced-motion` respected.

See `NOTES.md` for decisions, deviations, and known limits.
