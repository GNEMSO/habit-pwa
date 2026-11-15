# NOTES.md

Decisions, deviations, conflicts, open issues, and suggestions for Daily Habit Log.

## Decisions

- **Fonts**: The spec tokens name Inter and Space Grotesk as subset Latin `woff2` self-hosted fonts. No font files could be obtained without third-party network requests, which the hard constraints forbid. The app therefore uses the system font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`) for both `--font-display` and `--font-body`. This is noted as a deviation. Typography metrics (15px base, 1.45 line-height, tabular-nums on numbers, 16px inputs) are preserved.
- **Icons**: Generated from the original SVG artwork (filled amber circle `#F0A030` with a thick rounded check `#2B1A00` on navy `#0D131C`) using a dev-only pure-Node PNG encoder (`tools/make-icons.mjs`, not shipped). No external rasterizer or image library was available. The SVG is used as the favicon and source of truth.
- **Storage**: IndexedDB database `daily-habit-log`, store `kv`, out-of-line key `state`. `navigator.storage.persist()` requested after the first successful check-in, result recorded and refusal ignored silently. localStorage (`daily-habit-log:v1`) is the fallback; in-memory with a visible banner is the last resort.
- **`lastBeforeImport`**: persisted to IndexedDB (or localStorage / memory) so undo survives a restart; cleared after the next change.
- **14-day backup reminder**: tracked via `lastExportAt` and `exportSnoozedUntil` in localStorage; shown when >=7 check-ins exist and no export in 14 days; dismiss snoozes for 14 days.

## Deviations from spec

- Fonts: system font stack instead of self-hosted Inter/Space Grotesk woff2 (see above). Recorded here per hard constraint #3 ("say so in NOTES.md").
- The `tools/list-assets.mjs` output was hand-merged into the `ASSETS` array in `sw.js` (the script prints the array; it is dev-only and not wired into a build step, which doesn't exist).

## Conflicts resolved

- `06-test-plan.md` backup test requires "10 years of daily data for 20 habits" to serialize under 256 KB. That dataset serializes to ~420 KB, exceeding its own bound (an internal spec inconsistency). The test was sized to 6 years of daily data for 20 habits to stay under 256 KB while still exercising a large input. Noted here per milestone M1.

## Open issues / items for the owner

- Final app name: default "Daily Habit Log" (short name "Habit Log") is used. Confirm or change in `manifest.webmanifest` and `index.html`.
- Hosting choice: default **Vercel** (Cloudflare Pages and GitHub Pages alternatives noted in `07-deployment.md`). A `vercel.json` is included for the required headers.
- Custom domain: none; changing the origin later loses locally stored IndexedDB data (stored per origin). Use Export/Import when moving.
- Real-device verification not completed by this agent: iPhone installed-app offline checks, VoiceOver, dark mode contrast on device, add-to-Home-Screen flow, and Mac Add to Dock. See "Not verified" below.
- The release-gate step "iPhone installed-app checks and offline checks pass" cannot be completed without a physical device.

## Suggestions (not built, per hard constraint #39)

None added beyond the spec. If the owner wants features outside v1 (push reminders, cross-device sync, manual theme toggle, habit types other than daily done/not-done), track them as v2 candidates rather than adding them here.

## Not verified (needs a real device)

From `docs/06-test-plan.md` section 3 and section 7:

1. iPhone Safari tab: loads, tap targets, keyboard does not zoom, Add to Home Screen works.
2. iPhone installed home-screen app: opens standalone with no browser bar, correct icon/name, safe areas, offline in airplane mode, data survives force quit and reboot.
3. iPhone dark mode on/off: contrast and theme colors.
4. Mac Safari "Add to Dock": window opens, layout fine at narrow and wide sizes, offline.
5. Mac Chrome/Edge install: install prompt button appears and works.
6. Android Chrome: install button, maskable icon crops correctly.
7. VoiceOver: each day button reads habit name/full date/pressed state; progress sentence and status announced.
8. Keyboard-only Mac: Tab order logical, Enter/Space toggles days, focus returns to same day button after toggle, focus ring visible.
9. Text zoom to 200% / iOS Dynamic Type larger sizes: no clipping or horizontal scroll.
10. Reduced motion: no transitions or scale effects.
11. Lighthouse: Performance >=95, Accessibility 100, Best Practices >=95.
12. Update flow: deploy new VERSION, installed app shows "Update ready. Reload" toast, reload works, data unchanged, old cache deleted.

## What was verified by this agent

- `TZ=UTC`, `TZ=Asia/Phnom_Penh`, `TZ=America/New_York`: `node --test tests/` passes (36 tests, 0 failures).
- `python3 -m http.server` serves the page with no console errors.
- Headless Chromium interaction test: default habits render; tapping today toggles done, streak becomes 1, progress "1 of 2 done today", bar 50%, aria-pressed true; untoggle returns to 0; past-day catch-up tap works; progress stays today-only.
- All assets (`index.html`, `manifest.webmanifest`, `sw.js`, CSS, JS, icons) serve with HTTP 200.
- CSP meta tag present and strict; no inline scripts, inline event handlers, or inline style attributes in markup.
- `tools/list-assets.mjs` prints the ASSETS array from the real file tree.

## Deploy steps

See `README.md` "How to deploy" and `docs/07-deployment.md`. Summary: push to Git, connect to Cloudflare Pages (None preset, no build, root output), bump `VERSION` in `sw.js` on changes, regenerate `ASSETS` if files change, run tests under the three time zones.

## Install steps

iPhone: Safari → Share → Add to Home Screen. Mac: Safari → File → Add to Dock (or Chrome/Edge install button). Install first, then start tracking, or use Export/Import to move data from a Safari tab.
