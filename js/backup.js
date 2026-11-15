// Backup / import: export format, parsing, validation, normalization, delivery.
// Pure where possible; shareOrDownload is the only impure function.

const SUPPORTED_SCHEMA = 1;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMPORT_NAME = 60;

// Normalization (05-data-storage-sync.md). Never throws.
export function normalizeState(input) {
  let o = input;
  if (o === null || o === undefined || typeof o !== 'object' || Array.isArray(o)) {
    return { v: 1, habits: [], log: {}, updatedAt: 0 };
  }

  const habits = [];
  if (Array.isArray(o.habits)) {
    for (const h of o.habits) {
      if (h && typeof h.id === 'string' && typeof h.name === 'string') {
        habits.push({ id: h.id.slice(0, 40), name: h.name.slice(0, 60) });
      }
    }
  }
  // drop duplicate ids, keep first
  const seen = new Set();
  const uniqueHabits = [];
  for (const h of habits) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    uniqueHabits.push(h);
  }

  const log = {};
  if (o.log && typeof o.log === 'object' && !Array.isArray(o.log)) {
    const habitIds = new Set(uniqueHabits.map((h) => h.id));
    for (const k of Object.keys(o.log)) {
      if (!DATE_KEY_RE.test(k)) continue;
      const v = o.log[k];
      if (!Array.isArray(v)) continue;
      const a = [];
      for (const x of v) {
        if (typeof x === 'string' && habitIds.has(x) && !a.includes(x)) a.push(x);
      }
      if (a.length) log[k] = a;
    }
  }

  const updatedAt = Number(o.updatedAt);
  return {
    v: 1,
    habits: uniqueHabits,
    log,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
  };
}

export function exportBackup(state) {
  return {
    app: 'daily-habit-log',
    schema: SUPPORTED_SCHEMA,
    exportedAt: new Date().toISOString(),
    state: normalizeState(state)
  };
}

// Accepts a wrapped backup or a bare state object ({habits, log}).
export function parseBackup(text) {
  if (typeof text !== 'string') {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch (err) {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  let state;
  if (parsed && parsed.app !== undefined && parsed.schema !== undefined) {
    if (parsed.app !== 'daily-habit-log') {
      return { ok: false, error: 'That file is not a Daily Habit Log backup.' };
    }
    if (typeof parsed.schema !== 'number' || parsed.schema > SUPPORTED_SCHEMA) {
      return { ok: false, error: 'This backup was made by a newer version of the app.' };
    }
    state = parsed.state;
  } else if (parsed && (parsed.habits || parsed.log)) {
    // bare state object
    state = parsed;
  } else {
    return { ok: false, error: 'That file is not a Daily Habit Log backup.' };
  }

  const normalized = normalizeState(state);
  return { ok: true, state: normalized };
}

export function summaryOf(state) {
  let checkIns = 0;
  for (const k of Object.keys(state.log)) checkIns += state.log[k].length;
  const updatedAt = state.updatedAt ? new Date(state.updatedAt).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short'
  }) : 'never';
  return { habits: state.habits.length, checkIns, updatedAt };
}

// Deliver a JSON string: Web Share with file > anchor download > copy signal.
export async function shareOrDownload(json, fileName) {
  const blob = new Blob([json], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Daily Habit Log backup' });
      return 'share';
    } catch (err) {
      // user cancelled or share failed; fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'download';
}
