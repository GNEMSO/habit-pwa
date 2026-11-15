# 05. Data, Storage, Backup, and Future Sync

## State shape (schema version 1)

Identical to the current page, so existing logic and data carry over.

```json
{
  "v": 1,
  "habits": [
    { "id": "h-exercise", "name": "Exercise" },
    { "id": "h-wake", "name": "Wake up early" }
  ],
  "log": {
    "2026-11-13": ["h-exercise", "h-wake"],
    "2026-11-14": ["h-exercise"]
  },
  "updatedAt": 1763100000000
}
```

| Field | Type | Rules |
|---|---|---|
| `v` | number | Schema version. Always 1 for now |
| `habits[].id` | string | 1 to 40 chars. Generated as `h` + base36 timestamp + 4 random base36 chars. Never reused |
| `habits[].name` | string | Trimmed, 1 to 40 chars when created through the UI. Accept up to 60 when importing |
| `log` | object | Keys are local dates `YYYY-MM-DD`. Values are arrays of habit ids done that day. Empty arrays are removed |
| `updatedAt` | number | Milliseconds since epoch of the last change. 0 for untouched defaults |

Habit order is array order.

## Normalization (apply on load and on import)

1. Treat any non-object input as empty.
2. Keep only habits where `id` and `name` are strings. Truncate id to 40 and name to 60.
3. Drop habits with duplicate ids (keep the first).
4. Keep only `log` keys matching `^\d{4}-\d{2}-\d{2}$` whose values are arrays; keep only string entries; drop entries whose habit id does not exist; drop empty arrays; de-duplicate ids within a day.
5. `updatedAt` becomes a number, or 0.
6. Set `v` to 1.

Normalization never throws.

## IndexedDB layout

- Database name: `daily-habit-log`, version 1.
- Object store: `kv` (no key path, out-of-line keys).
- Records:
  - `state`: the state object above.
  - `meta`: `{ lastExportAt, exportReminderSnoozedUntil, installHintDismissed }`.
  - `lastBeforeImport`: the state before the most recent import, or absent.
  - `corruptBackup`: raw value saved if `state` failed normalization badly (optional).
- Wrap IndexedDB in small promise helpers inside `store.js`. No libraries.

Write policy:
- Debounce about 400 ms after the last change; serialize writes (never two in flight); coalesce to the latest state.
- On `pagehide` and `visibilitychange` to hidden, flush immediately.
- After the first successful check-in, call `navigator.storage.persist()` once and record the result. Ignore refusal silently; the backup reminder covers it.

Migration:
- Open with `onupgradeneeded` creating the `kv` store if missing.
- If a future schema `v` greater than the app supports is found, do not overwrite. Show "This data was made by a newer version of the app" and open in read-only mode.
- Write migrations as pure functions `migrate(state) -> state` keyed by version.

## Fallbacks

- If IndexedDB fails to open, try `localStorage` key `daily-habit-log:v1` with the same JSON. If that also fails, run in memory with the warning banner from `02-architecture.md`.

## Backup file format

```json
{
  "app": "daily-habit-log",
  "schema": 1,
  "exportedAt": "2026-11-14T08:30:00.000Z",
  "state": { "v": 1, "habits": [], "log": {}, "updatedAt": 0 }
}
```

Export:
- File name `daily-habit-log-YYYY-MM-DD.json` (local date), UTF-8, 2-space indentation.
- Record `meta.lastExportAt` after the owner confirms the share or download action (or immediately when only a download link was used).

Import validation:
1. Parse JSON. On failure: "That file is not valid JSON."
2. `app` must equal `daily-habit-log`. Otherwise: "That file is not a Daily Habit Log backup."
3. `schema` must be a number not greater than the supported schema. Otherwise: "This backup was made by a newer version of the app."
4. Normalize `state`. If it has zero habits and zero check-ins, ask for confirmation before replacing.
5. Show the summary: habit count, total check-ins, `updatedAt` as a readable date.

Modes:
- Replace: the imported normalized state becomes the state.
- Merge: union habits by id (existing names win); union check-ins by (date, habit id); `updatedAt` becomes now.
- Both modes store the previous state to `lastBeforeImport` first and expose a single "Undo import" action.

Also accept a bare state object (no wrapper) with `habits` and `log` for convenience.

## Accepting data from the Claude-hosted page

The Claude-hosted version stores the same state shape. A future "Export backup" button added to that page would produce exactly the format above, so Import here works without conversion.

## Privacy

- All data stays on the device unless the owner exports it.
- No analytics, no crash reporters, no remote logging. `connect-src 'self'` in the CSP enforces this.

## Future sync (v2, optional)

Not part of v1. If the owner later wants automatic sync between iPhone and Mac:

| Option | What it is | Trade-offs |
|---|---|---|
| Export and import (v1) | Manual JSON file | Zero cost, zero backend, manual |
| File sync through the owner's cloud drive | Save the JSON in iCloud Drive or similar and re-import | Still manual, no backend |
| Small hosted backend (for example a Cloudflare Worker with KV or D1, or Supabase, or Firebase) | Login or secret token, push and pull state | Free tiers exist but limits change, so verify before choosing. Adds accounts, secrets, and a privacy surface |
| CRDT or per-entry log | Merge-safe data model | More engineering, mostly unnecessary for one person |

If v2 is built, change the data model before wiring sync so merges are safe:

- Store each check-in as its own record `{habitId, date, done, updatedAt}` (a tombstone with `done:false` when unchecked) and each habit with `updatedAt` and `deleted` flags.
- Resolve conflicts per record by latest `updatedAt` (last writer wins).
- Keep the backup format versioned (`schema: 2`) and provide a v1 to v2 migration.
- Sync on app open, on `visibilitychange` to visible, and after changes, with exponential backoff. Always keep the app fully usable offline.
