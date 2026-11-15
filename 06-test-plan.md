# 06. Test Plan

## 1. Automated unit tests (Node, no dependencies)

Use Node's built-in runner: `node --test tests/`. Logic modules must be importable in Node without a DOM. Pass `today` and `now` as parameters instead of reading the clock inside the functions.

### dates.test.js
- `dateKey` pads month and day (`2026-01-05`).
- `addDays` across month end, year end, and leap day (2028-02-28 plus 1 and plus 2).
- `addDays` across a daylight saving change (run with `TZ=America/New_York` and `TZ=Europe/London`): adding 1 day to the day before the change gives the next calendar date, never the same date twice.
- `mondayOf` for every weekday, including Sunday (belongs to the previous Monday's week).
- `dayNumber` differs by exactly 1 for consecutive dates, including across daylight saving changes.

### stats.test.js
- Streak table from `03-functional-spec.md` (FR-3), all five rows.
- Streak when today is not done and yesterday is done.
- Best streak with multiple runs, a run of 1, an empty log, and a run crossing a daylight saving change.
- `doneInLast(…, 30)` includes today and excludes day 31.
- `weekCells` marks the right cell as today, marks later cells as future, and has exactly 7 items.
- `historyGrid` returns 84 cells, marks cells after today as future, and its `total` counts only non-future cells. Check a Monday (6 future cells) and a Sunday (0 future cells).

### reducer.test.js
- `TOGGLE_DAY` adds then removes; empty day arrays are deleted; returns a new object; input is not mutated.
- `ADD_HABIT` trims, truncates to 40, ignores empty, enforces the 20 limit.
- `RENAME_HABIT` trims, ignores empty and unchanged.
- `DELETE_HABIT` removes the habit and every check-in for it.
- `IMPORT_STATE` replace and merge, with merge keeping existing names and unioning check-ins.
- `updatedAt` equals the injected `now` after every change.

### backup.test.js
- Round trip: export then parse gives an equal state.
- Rejects invalid JSON, wrong `app`, newer `schema`.
- Normalization removes junk: non-string ids, bad date keys, unknown habit ids, duplicates, empty days.
- Accepts a bare state object.
- Very large input (10 years of daily data for 20 habits) normalizes in under 200 ms and stays under 256 KB serialized.

Run the date tests under at least three time zones: `UTC`, `Asia/Phnom_Penh`, and `America/New_York`.

## 2. Installability and PWA checks

In Chrome DevTools, Application panel:
- Manifest: no errors or warnings; all three icons load; "Installability" shows no blocking issues.
- Service Workers: status "activated and is running"; "Update on reload" works while developing.
- Cache Storage: contains exactly the current `habit-log-vN` cache, and its contents match the shipped files.
- Storage: IndexedDB `daily-habit-log` exists with `kv` entries.

Also run Lighthouse for performance, accessibility, and best practices, and review its installability diagnostics where available. Targets: Performance 95 or more, Accessibility 100, Best Practices 95 or more.

## 3. Manual device matrix

| Device | Browser or mode | Required checks |
|---|---|---|
| iPhone (iOS 16.4 or newer) | Safari tab | Loads, tap targets, keyboard does not zoom, add to Home Screen works |
| iPhone | Installed home screen app | Opens standalone with no browser bar, correct icon and name, safe areas, offline in airplane mode, data survives force quit and reboot |
| iPhone | Dark mode on and off | Contrast and theme colors |
| Mac | Safari "Add to Dock" | Window opens, layout fine at narrow and wide sizes, offline |
| Mac | Chrome or Edge install | Install prompt button appears and works |
| Android | Chrome | Install button, maskable icon crops correctly |

For each: complete the acceptance criteria in `03-functional-spec.md` that apply.

## 4. Scenario tests (manual)

1. Fresh install, no data: defaults appear.
2. Track for several days by changing the device date forward (or by toggling past days): streak and history update; clean up afterward.
3. Midnight rollover: leave the app open across midnight (or move the clock), confirm header, today highlight, and stats update within 30 seconds.
4. Time zone change: set a different time zone, reopen, confirm "today" matches the new local date and old check-ins keep their dates.
5. Offline: load once online, enable airplane mode, force quit, reopen, toggle days, reopen again, data persists.
6. Update: deploy a change with a new `VERSION`, open the installed app online, confirm the "Update ready. Reload" toast appears, press it, confirm the new version runs and the old cache is deleted. Confirm data is unchanged.
7. Backup and restore: export, change data, import with Replace, confirm; undo import; import with Merge.
8. Storage failure: open in a private window of a browser that blocks IndexedDB (or simulate by blocking it in DevTools), confirm the banner and that the app stays usable.
9. Habit limits: add up to 20 habits, confirm the 21st is rejected; check layout with very long names (40 characters, no spaces) for overflow.
10. Rapid taps: tap the same day 20 times quickly, confirm the final state matches the parity of taps and only one write is in flight at a time.

## 5. Accessibility checks

- VoiceOver on iPhone: each day button reads habit name, full date, and pressed state; progress sentence is announced after a change; status messages are announced.
- Keyboard only on Mac: Tab order is logical, Enter or Space toggles days, focus stays on the same day button after a toggle, focus ring is visible.
- Text zoom to 200 percent and iOS Dynamic Type larger sizes: no clipping or horizontal scroll.
- Reduced motion enabled: no transitions or scale effects.
- Contrast: verify body text, muted text, accent text, danger text, and focus outline in both themes against WCAG AA.

## 6. Security checks

- Enter `<img src=x onerror=alert(1)>` and `"><script>` as habit names: they must render as literal text everywhere, including `aria-label` and `value` attributes.
- The CSP produces no console violations during normal use.
- No network requests besides same-origin ones (check the Network panel).

## 7. Release gate (all must be true)

- All unit tests pass in all three time zones.
- DevTools shows no manifest, service worker, or console errors.
- iPhone installed-app checks and offline checks pass.
- Both themes pass contrast.
- A fresh clone can be served with a static server and installed without any build step.
