# 04. PWA Requirements

## Installability checklist

- Served over HTTPS (or `localhost` during development).
- A valid web app manifest linked from `index.html`.
- 192 px and 512 px PNG icons, plus a maskable icon.
- A registered service worker with a `fetch` handler that serves the start page offline.
- `start_url` loads without a network after the first visit.

## index.html head

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Daily Habit Log</title>

  <link rel="manifest" href="./manifest.webmanifest">
  <meta name="theme-color" content="#F2F4F8" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0D131C" media="(prefers-color-scheme: dark)">
  <meta name="color-scheme" content="light dark">

  <!-- iOS / iPadOS home screen -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Habit Log">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="apple-touch-icon" href="./icons/apple-touch-icon-180.png">

  <link rel="icon" type="image/svg+xml" href="./icons/icon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">

  <!-- CSP: see 02-architecture.md -->
  <link rel="stylesheet" href="./css/tokens.css">
  <link rel="stylesheet" href="./css/app.css">
  <link rel="preload" href="./fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="./fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
</head>
<body>
  <main class="app">...</main>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

## manifest.webmanifest

```json
{
  "id": "daily-habit-log",
  "name": "Daily Habit Log",
  "short_name": "Habit Log",
  "description": "Check off daily habits and watch your streaks grow. Works offline.",
  "start_url": "./?source=pwa",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F2F4F8",
  "theme_color": "#F2F4F8",
  "lang": "en",
  "categories": ["health", "lifestyle", "productivity"],
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "./icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Rules:
- Keep `start_url` and `scope` relative so the app works under a subpath.
- Do not combine `any` and `maskable` in one icon entry; use separate files.
- Serve the manifest as `application/manifest+json` where the host allows it. `.webmanifest` is usually mapped automatically.

## Icons

Create an original icon: a filled amber circle (`#F0A030`) with a thick rounded check mark (`#2B1A00`) on a deep navy background (`#0D131C`). Do not reuse artwork, shapes, or color combinations from other habit apps.

| File | Size | Notes |
|---|---|---|
| `icon.svg` | vector | Source of truth, used as favicon |
| `icon-192.png` | 192 x 192 | `purpose: any` |
| `icon-512.png` | 512 x 512 | `purpose: any` |
| `icon-maskable-512.png` | 512 x 512 | Full-bleed navy background. Keep the circle and check inside the central 80 percent safe zone so any mask shape can crop it |
| `apple-touch-icon-180.png` | 180 x 180 | Full-bleed square, no transparency, no rounded corners (iOS rounds them itself) |
| `favicon-32.png` | 32 x 32 | Simplified: circle and check only |

Generate PNGs from the SVG with any available tool (for example a small Node script with a dev-only dependency that is not shipped, ImageMagick, or an online converter) and commit the results. Check the maskable icon in a maskable preview tool or by cropping to a circle manually.

## iOS and iPadOS specifics

- Install path: Safari, Share, "Add to Home Screen". iOS ignores most manifest fields in older versions, so keep the meta tags above in place in addition to the manifest.
- `apple-mobile-web-app-status-bar-style="default"` keeps the status bar solid and avoids content sliding under it. If `black-translucent` is ever used, add `padding-top: env(safe-area-inset-top)` to the page and re-test.
- Safe areas: `viewport-fit=cover` plus `padding-left/right: max(16px, env(safe-area-inset-left/right))` and `padding-bottom: env(safe-area-inset-bottom)`.
- Splash screens: iOS shows `background_color` or a white or system-colored flash. Set `body { background: var(--bg) }` and do not add per-device `apple-touch-startup-image` links in v1.
- Standalone mode has its own storage context separate from Safari tabs on some iOS versions. Data entered in a Safari tab before installing may not appear in the installed app. The install hint and the README must say "install first, then start tracking, or use Export and Import to move data".
- Storage: iOS may clear website data for sites the owner has not visited in a long time while they are used only in Safari tabs. Installed home screen apps are treated more favorably. Request persistent storage and keep the backup reminder (FR-11).
- File download from a standalone app can be awkward. Prefer the Web Share API with a file (`navigator.canShare({files})`), then fall back.
- Keyboard: inputs use 16 px font to avoid the automatic zoom.
- Prevent accidental double-tap zoom with `touch-action: manipulation` on interactive elements.

## macOS

- Safari 17 or newer: File, "Add to Dock" creates a web app. Chrome and Edge: Install icon in the address bar or menu.
- Dock web apps open in their own window; the layout must work at widths from 360 px to a wide desktop window (the 560 px column simply centers).
- Provide a `Cmd/Ctrl+Z`-free design: no keyboard shortcuts required in v1.

## Service worker (`sw.js`)

Strategy: precache the app shell at install; serve cache-first for same-origin GET requests; fall back to the cached `index.html` for navigations; never touch non-GET or cross-origin requests.

```js
const VERSION = 'v1';                       // bump on every deploy that changes any shipped file
const CACHE = `habit-log-${VERSION}`;
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/app.css',
  './js/app.js', './js/dates.js', './js/stats.js', './js/reducer.js',
  './js/store.js', './js/render.js', './js/backup.js', './js/pwa.js',
  './fonts/inter-var.woff2', './fonts/space-grotesk-var.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon-180.png', './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));   // do NOT call skipWaiting here
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('habit-log-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});
```

Requirements beyond the sketch:
- Generate the `ASSETS` list from the real file tree so nothing is forgotten. A tiny Node script (`tools/list-assets.mjs`, dev only) is acceptable.
- Register with `navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })` after the `load` event.
- Update flow in `pwa.js`: when `registration.waiting` exists and there is a controller, show the toast "Update ready. Reload" with a button. The button posts `'SKIP_WAITING'` to the waiting worker and reloads on `controllerchange`. Guard against reload loops with a one-time flag.
- Never cache IndexedDB data in the Cache Storage.

## Offline behavior

- Everything is local, so offline and online behavior are identical.
- The only network use is fetching `sw.js` and updated files when online.
- No offline banner needed. Do not show network status.

## Install UX

- Chromium: listen for `beforeinstallprompt`, `preventDefault()`, store the event, show "Install app" in the tools area, call `prompt()` on click, hide on `appinstalled`.
- iOS Safari: show the hint from FR-12 once per device unless dismissed.
- Detect standalone: `window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`.

## Notifications (not in v1, planning notes)

Reminders for waking up early would need Web Push:

- iOS and iPadOS 16.4 or newer supports Web Push only for web apps added to the Home Screen, and the permission prompt must be triggered by a user gesture.
- Requires a push service the owner hosts: a small serverless function that stores subscriptions and sends VAPID-signed pushes on a schedule (for example a Cloudflare Worker with a cron trigger). This introduces a backend, secrets, and a privacy surface.
- The Notification Triggers API (scheduled local notifications without a server) is not shipped in browsers, so do not rely on it.
- Reliability on iOS is lower than a native alarm. Recommendation: keep using the phone's Clock alarm for waking up, and treat push as an optional v2 feature behind a clear settings toggle.

## Not required in v1

Background sync, periodic background sync, share target, shortcuts, screenshots in the manifest, window controls overlay, badging API. They can be added later without changing the architecture.
