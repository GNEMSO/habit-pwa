# 03. Functional Specification

Reference implementation: `reference/current-tracker.html`. Where this spec and that file differ, this spec wins.

## Screen layout (single screen, one column, max width 560 px, centered)

1. Header: eyebrow "Today", the date as the page title, a progress bar, a progress sentence.
2. Habit cards, one per habit, in creation order.
3. "Last 12 weeks" history card with one row per habit.
4. Tools: "Edit habits" toggle button, and (when editing) the add-habit form.
5. Backup and restore section.
6. Status line (live region) at the bottom.

## Functional requirements

### FR-1 Today header
- Title shows the local date formatted with `toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'})`, for example "Saturday 14 November".
- Progress sentence: no habits gives "No habits yet"; all done gives "All N done today"; otherwise "X of N done today".
- The progress bar fill width equals `round(done / total * 100)` percent, 0 when there are no habits. The bar is decorative (`aria-hidden`); the sentence is the accessible equivalent (`role="status"`).

### FR-2 Habit card
- Shows the habit name, the current streak number with the label "day streak", a seven-day week row, and a stats line.
- Week row runs Monday to Sunday of the current week. Each day shows a narrow weekday letter above a circular button.
- Day button states:
  - Not done (past or today): outlined circle with the day-of-month number.
  - Done: filled accent circle with a check mark.
  - Today: darker outline and a bold weekday letter.
  - Future: dashed, faded, disabled, not focusable by tap.
- Tapping a past or today button toggles done. Toggling past days is allowed (catch-up).
- Each button has `aria-pressed` and an `aria-label` such as "Exercise, Monday 9 November".
- Minimum tap target: 44 by 44 CSS px at 360 px wide screens. On narrow screens the circle shrinks with its grid column; below 40 px, increase the row gap rather than reduce the hit area.

### FR-3 Current streak
Count consecutive done days ending today. If today is not done, start counting from yesterday (so an unfinished today does not zero the streak).

| Done days (today = D) | Streak |
|---|---|
| D, D-1, D-2 | 3 |
| D-1, D-2, D-3 | 3 |
| D, D-2 | 1 |
| D-2 only | 0 |
| none | 0 |

### FR-4 Best streak
Longest run of consecutive calendar days with the habit done, over all stored history. Uses integer day numbers so daylight saving changes do not break runs.

### FR-5 Last 30 days
Number of done days among the 30 days ending today (today included). Display as "Last 30 days X/30".

### FR-6 History grid
- 12 week columns by 7 day rows, Monday at the top. The right-most column is the current week.
- Cell states: done (accent), not done (muted), future (transparent).
- Next to the grid: habit name and "D of T days" where T counts non-future cells.
- The grid has `role="img"` with an `aria-label` like "Exercise: 31 of 80 days done in the last 12 weeks". Individual cells are decorative.

### FR-7 Edit mode
- "Edit habits" toggles edit mode (`aria-pressed`). The button text becomes "Done editing".
- In edit mode each card replaces the name and streak with a text input (16 px font to avoid iOS zoom) and a "Delete" button; the week row stays tappable.
- Rename commits on the `change` event (blur or Enter). Name is trimmed and limited to 40 characters. Empty or unchanged reverts silently.
- Delete is two-step with no browser dialogs: first tap changes the label to "Tap again to delete" with a danger style; second tap deletes the habit and removes its check-ins. Any other tap cancels.
- The add form (text input and "Add" button) appears in edit mode. Empty names are ignored. Maximum 20 habits; at the limit show "You can track up to 20 habits." in the status line.
- Duplicate names are allowed.

### FR-8 First-run defaults
When no stored data exists: habits "Exercise" (`h-exercise`) and "Wake up early" (`h-wake`), no check-ins.

### FR-9 Persistence
Every change is saved to IndexedDB (debounced about 400 ms, serialized). Reloading, killing the app, or rebooting the phone keeps all data. Status line shows "Saved", "Saving", or an error message.

### FR-10 Day rollover
If the app stays open past midnight, or returns from the background on a new date, the header, week row, and stats update to the new date without a reload.

### FR-11 Backup and restore
- "Export backup" produces a JSON file named `daily-habit-log-YYYY-MM-DD.json` using the Web Share API with a file when available, otherwise a download link, otherwise (as a last resort) a text area with the JSON and a "Copy" button.
- "Import backup" accepts a JSON file chosen with a file input, or pasted text. It validates (see `05-data-storage-sync.md`), shows a summary ("3 habits, 214 check-ins, last change 12 Nov"), and offers two in-page choices: "Replace everything" or "Merge" (union of habits by id and union of check-ins). Replace requires a second tap on a "Replace and cannot undo" button.
- Before any import, the app silently stores the previous state in a `lastBeforeImport` record so one undo is possible ("Undo import" button, visible until the next change).
- Gentle reminder: if no export has happened for 14 days and at least 7 check-ins exist, show a dismissible note "Back up your data" (dismiss snoozes for 14 days).

### FR-12 Install guidance
- Android and desktop Chromium: capture `beforeinstallprompt`, show an "Install app" button, hide it after install.
- iPhone and iPad Safari (not already standalone): show a dismissible hint "To install: tap Share, then Add to Home Screen". Detect with user agent plus `navigator.standalone === false`. Remember the dismissal.
- Hide all install UI when running standalone (`matchMedia('(display-mode: standalone)')` or `navigator.standalone`).

### FR-13 Offline and updates
- After the first load the app starts and works with no network.
- When a new version is deployed and installed in the background, show a non-blocking toast "Update ready. Reload" with a button. Never reload automatically while the owner may be mid-edit.

### FR-14 Theming
- Follows the system light or dark setting through `prefers-color-scheme`. A manual toggle is out of scope for v1.
- `<meta name="theme-color">` with both light and dark values via `media` attributes.

## Business rules summary

- A check-in is the pair (habit id, local date key). Toggling twice removes it.
- Deleting a habit removes all of its check-ins.
- Habit ids are opaque strings, never shown to the owner, never reused.
- Dates never in the future can be toggled; future cells are disabled.
- Maximum 20 habits, 40 characters per name.

## Copy (exact UI strings)

| Where | Text |
|---|---|
| Eyebrow | Today |
| Progress | `X of N done today` / `All N done today` / `No habits yet` |
| Streak label | day streak |
| Stats | `Best streak B` and `Last 30 days C/30` |
| History heading | Last 12 weeks |
| History note | Each column is a week, Monday at the top. The right-hand column is this week. |
| History count | `D of T days` |
| Edit toggle | Edit habits / Done editing |
| Delete | Delete / Tap again to delete |
| Add placeholder | e.g. Read for 20 minutes |
| Empty state | No habits yet. Choose Edit habits to add your first one. |
| Save status | Saved / Saving / Could not save. Retrying. / Not saved |

Write errors in plain language: say what happened and what to do. No apologies, no exclamation marks.

## Design tokens

Port these exactly into `css/tokens.css`. Light values on bare `:root`; dark values under `@media (prefers-color-scheme: dark)` and also under an optional `:root[data-theme="dark"]` hook; set `color-scheme: dark` in dark.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F2F4F8` | `#0D131C` |
| `--surface` | `#FFFFFF` | `#151D29` |
| `--surface-2` | `#E8ECF3` | `#1F2A39` |
| `--line` | `#D3DAE6` | `#2B384A` |
| `--ink` | `#141C2B` | `#E7ECF4` |
| `--muted` | `#586579` | `#93A1B5` |
| `--accent` | `#F0A030` | `#F4B04E` |
| `--on-accent` | `#2B1A00` | `#2B1A00` |
| `--accent-text` | `#9A5A00` | `#F4B04E` |
| `--focus` | `#2457C5` | `#8FB2FF` |
| `--danger` | `#B3261E` | `#FF9A8F` |

Typography: headings Space Grotesk (500 to 700), body Inter (400 to 600), base 15 px, line-height 1.45. Use `font-variant-numeric: tabular-nums` for every number. Inputs 16 px. Day buttons are circles, cards have 12 px radius and a 1 px line border, no shadows. Heatmap cells are 16 px squares with a 4 px gap and 3 px radius.

Honor `prefers-reduced-motion`: remove the bar transition, the button transition, and the press-scale effect.

## Accessibility

- Every control is reachable and operable by keyboard; visible 3 px focus outline using `--focus`.
- Color is never the only signal: done days show a check mark.
- All text meets WCAG AA contrast against its background in both themes.
- Live regions: progress sentence and status line use `role="status"`.
- Screen reader label for each day button as in FR-2.
- Touch: `touch-action: manipulation` on buttons, `-webkit-tap-highlight-color: transparent`.

## Acceptance criteria (Given, When, Then)

1. Given first run, when the app loads, then "Exercise" and "Wake up early" appear with empty weeks and "0 day streak".
2. Given today is Wednesday, when the owner taps Wednesday for Exercise, then the circle fills with a check, the streak shows 1, the progress sentence reads "1 of 2 done today", and the bar is 50 percent.
3. Given Exercise is done Monday and Tuesday and not Wednesday (today), when the app renders, then the streak shows 2. After tapping Wednesday it shows 3.
4. Given a future day in the current week, when it renders, then it is dashed, faded, and not tappable.
5. Given the owner renames a habit to "  Run  ", when focus leaves the input, then the name is "Run" and it is saved.
6. Given the owner taps Delete once, when they tap elsewhere, then the habit remains. When they tap Delete twice in a row, then the habit and its check-ins are gone.
7. Given 20 habits, when the owner submits a new one, then nothing is added and the status line says "You can track up to 20 habits."
8. Given check-ins, when the owner force-quits and reopens the app in airplane mode, then all check-ins are present and the app works.
9. Given the app is open at 23:59, when the date changes to the next day, then within 30 seconds the header date, week row highlight, and today stats update.
10. Given a valid backup file, when imported with "Merge", then habits and check-ins from both sources are present, and "Undo import" restores the earlier state.
11. Given an invalid file, when imported, then the owner sees a plain error, and the current data is untouched.
12. Given dark mode, when the app renders, then all text and controls remain legible and the accent works on both backgrounds.
