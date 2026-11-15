# 08. Instruction Prompt

Give everything below the line to the coding agent (for example Claude Code) in an empty project folder that contains this pack in `docs/`.

---

## Role

You are a senior front-end engineer. Build an installable, offline-first Progressive Web App called "Daily Habit Log" from the specification in `docs/`. Work autonomously in small verified steps, and report briefly at the end of each milestone.

## Context

The owner already has a working single-file habit tracker (`docs/reference/current-tracker.html`) hosted inside claude.ai. It cannot be installed as a PWA. Your job is to rebuild it as a standalone static site with the same features and look, plus PWA capabilities, local storage, and backup and restore. The owner will install it on an iPhone (Safari, Add to Home Screen) and a Mac (Add to Dock) and wants it to work offline, free, with no accounts.

## Read first, in this order

1. `docs/README.md`
2. `docs/01-product-overview.md`
3. `docs/02-architecture.md`
4. `docs/03-functional-spec.md`
5. `docs/04-pwa-requirements.md`
6. `docs/05-data-storage-sync.md`
7. `docs/06-test-plan.md`
8. `docs/07-deployment.md`
9. `docs/reference/current-tracker.html` (behavior and visual reference; port its logic, do not copy its Claude-specific sync code)

If two documents disagree, the later-numbered specific document wins over the overview, and `03-functional-spec.md` wins over the reference file. Record any conflict you resolve in `NOTES.md`.

## Hard constraints

- Plain HTML, CSS, and ES modules. No framework, no bundler, no TypeScript, no runtime npm dependencies. No build step is needed to run or deploy.
- Dev-only tooling is allowed only if it is never required to run the app (for example a one-off icon generation script). Do not commit `node_modules`.
- No third-party network requests at runtime: no CDNs, no Google Fonts, no analytics. Self-host fonts as subset Latin `woff2`. If you cannot obtain the font files, use the system font stack from the tokens and say so in `NOTES.md`.
- All URLs relative (`./`) so the app works at a domain root and under a subpath.
- Apply the CSP from `02-architecture.md`. No inline scripts, no inline event handlers, no inline `style` attributes in markup.
- Escape every dynamic string that is placed into HTML or attributes.
- Original branding only. Create the icon from the brief in `04-pwa-requirements.md`. Do not copy names, logos, or artwork from other habit apps.
- Keep data on the device only. No accounts, no backend, no tracking.
- Do not add features outside the spec. If you believe something is missing, add it to `NOTES.md` under "Suggestions" instead of building it.

## Deliverables

The file tree in `docs/02-architecture.md`, plus:

- `README.md` for the project: what it is, how to run locally, how to deploy, how to release (including bumping `VERSION`), how to back up and restore data.
- `NOTES.md`: decisions, deviations, conflicts, open issues, suggestions.
- `tests/` with the tests listed in `docs/06-test-plan.md`, runnable by `node --test tests/`.
- `_headers` as in `docs/07-deployment.md`.
- `tools/list-assets.mjs` (dev only) that prints the `ASSETS` array for `sw.js` from the real file tree.

## Milestones

Complete them in order. After each one, run the checks listed, fix problems, then give a short status (what is done, what you verified, anything unresolved) before moving on.

### M0. Scaffold
- Create the folder structure, an empty but valid `index.html`, and a static server instruction in the README.
- Check: `python3 -m http.server` serves the page with no console errors.

### M1. Pure logic with tests
- Implement `dates.js`, `stats.js`, `reducer.js`, and `backup.js` (parse, normalize, export) exactly per the specs.
- Write `tests/*.test.js`. Make them pass under `TZ=UTC`, `TZ=Asia/Phnom_Penh`, and `TZ=America/New_York`.
- Check: `TZ=... node --test tests/` for all three zones.

### M2. UI port
- Build `index.html`, `css/tokens.css`, `css/app.css`, `js/render.js`, and `js/app.js` to match FR-1 to FR-8, FR-10, FR-14, the design tokens, and the accessibility rules.
- State lives in memory for now (no persistence yet).
- Check: manually walk through acceptance criteria 1 to 7, 9, and 12 in a browser, in light and dark. Confirm keyboard focus returns to the same day button after toggling.

### M3. Storage
- Implement `store.js` with IndexedDB, debounced serialized writes, flush on `pagehide`, `navigator.storage.persist()`, the localStorage fallback, and the in-memory fallback with the banner. Add the save status messages.
- Check: reload keeps data; DevTools shows the `daily-habit-log` database; rapid taps never produce overlapping writes; corrupt data does not crash the app.

### M4. PWA shell
- Create `manifest.webmanifest`, icons (original artwork per the brief; generate PNGs from the SVG), meta tags, `sw.js`, and `js/pwa.js` (registration with `updateViaCache: 'none'`, update toast with the skip-waiting flow, Chromium install button, iOS install hint, standalone detection).
- Generate the `ASSETS` list with `tools/list-assets.mjs`.
- Check: DevTools Application shows a valid manifest, an active service worker, and a populated cache; the app loads with the network disabled; changing `VERSION` and reloading produces the update toast and removes the old cache.

### M5. Backup and restore
- Implement export (Web Share with file, download fallback, copy fallback), import (file and paste), validation messages, summary, Replace and Merge, `lastBeforeImport` with "Undo import", and the 14-day backup reminder.
- Check: acceptance criteria 10 and 11; round trip export and import; invalid files leave data untouched.

### M6. Polish and hardening
- Re-verify accessibility items in `docs/06-test-plan.md` section 5 and security items in section 6 (including script-like habit names).
- Check the layout at 320, 360, 390, 430, 768, and 1280 px wide: no horizontal scroll, no clipped text, tap targets at least 44 px where specified.
- Check Lighthouse targets and that the CSP produces no console violations.

### M7. Documentation and handoff
- Finish `README.md` and `NOTES.md`.
- Walk through `docs/07-deployment.md` and make sure the repository is ready to deploy to Cloudflare Pages or GitHub Pages without changes.
- Run the full release gate in `docs/06-test-plan.md` section 7 as far as you can without a physical device, and list every item that still needs the owner to test on a real iPhone or Mac.

## When to ask the owner

Ask only when blocked by something you cannot decide from the documents, for example the final app name or hosting choice. Otherwise choose the documented default, note it in `NOTES.md`, and continue. Never stop to ask permission for routine steps.

## Style of work

- Small commits with clear messages if Git is available.
- Prefer clear, boring code with short comments explaining why, not what.
- Keep each module within its contract in `docs/02-architecture.md`. Keep pure modules free of DOM and clock access.
- When something fails, find the cause before changing code. Do not disable checks or weaken tests to get green.
- Never claim something was tested unless you actually ran it. State clearly what was verified, how, and what was not.

## Definition of done

All of the following are true:

1. Every acceptance criterion in `docs/03-functional-spec.md` passes, or is listed in `NOTES.md` with the reason and a plan.
2. `node --test tests/` passes under `UTC`, `Asia/Phnom_Penh`, and `America/New_York`.
3. DevTools reports a valid manifest, an active service worker, and no console errors or CSP violations.
4. The app works with the network off after the first load and keeps data across restarts.
5. Export and import round-trip works, and bad files are rejected safely.
6. Both themes meet WCAG AA contrast; keyboard and screen reader checks pass.
7. The site is fully static, uses only relative URLs, makes no third-party requests, and deploys with no build step.
8. `README.md` and `NOTES.md` are complete and accurate.
9. A final message lists: what was built, how it was verified, what remains for the owner to test on real devices, and the exact steps to deploy and to install on iPhone and Mac.

## Final report format

End with these sections, in this order and keep it short: "What was built", "How it was verified", "Not verified (needs a real device)", "Deploy steps", "Install steps (iPhone, Mac)", "Open questions".
