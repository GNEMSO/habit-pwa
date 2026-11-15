// App entry: boot, state, event delegation, rendering. Persistence via store.js.
import { reduce } from './reducer.js';
import { startOfToday, dateKey } from './dates.js';
import { render } from './render.js';
import { loadState, saveStateDebounced, flushNow, subscribe, isStorageAvailable,
  saveLastBeforeImport, loadLastBeforeImport, clearLastBeforeImport } from './store.js';
import { exportBackup, parseBackup, shareOrDownload, summaryOf } from './backup.js';
import { initPWA } from './pwa.js';

function $(id) { return document.getElementById(id); }

const els = {
  dateLabel: $('dateLabel'), barFill: $('barFill'), progressText: $('progressText'),
  habits: $('habits'), historySection: $('historySection'), history: $('history'),
  editBtn: $('editBtn'), addForm: $('addForm'), status: $('status'),
  storageBanner: $('storageBanner'),
  importReview: $('importReview'), importSummary: $('importSummary'),
  importPaste: $('importPaste'), importPasteToggle: $('importPasteToggle'),
  exportCopy: $('exportCopy'), backupReminder: $('backupReminder')
};

let state = {
  v: 1,
  habits: [{ id: 'h-exercise', name: 'Exercise' }, { id: 'h-wake', name: 'Wake up early' }],
  log: {},
  updatedAt: 0
};
let editing = false;
let pendingDelete = null;
let lastFocus = null;
let today = startOfToday();
let lastDay = dateKey(today);
let importPending = null; // { state } waiting for Replace / Merge

function defaults() {
  return {
    v: 1,
    habits: [{ id: 'h-exercise', name: 'Exercise' }, { id: 'h-wake', name: 'Wake up early' }],
    log: {},
    updatedAt: 0
  };
}

function redraw() {
  render(state, { today, editing, pendingDelete, lastFocus }, els);
  lastFocus = null;
}
function setStatus(msg) { els.status.textContent = msg; }
function persist(s) { saveStateDebounced(s); }

function toggle(id, k) {
  state = reduce(state, { type: 'TOGGLE_DAY', habitId: id, key: k }, Date.now());
  pendingDelete = null;
  lastFocus = [id, k];
  persist(state);
  redraw();
}
function removeHabit(id) {
  state = reduce(state, { type: 'DELETE_HABIT', id }, Date.now());
  pendingDelete = null;
  persist(state);
  redraw();
}
function renameHabit(id, name) {
  state = reduce(state, { type: 'RENAME_HABIT', id, name }, Date.now());
  persist(state);
  redraw();
}
function addHabit(name) {
  if (state.habits.length >= 20) { setStatus('You can track up to 20 habits.'); return; }
  const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  state = reduce(state, { type: 'ADD_HABIT', id, name }, Date.now());
  persist(state);
  redraw();
}

function applyImported(incoming, mode) {
  state = reduce(state, { type: 'IMPORT_STATE', state: incoming, mode: mode }, Date.now());
  persist(state);
  clearLastBeforeImport();
  els.undoImportBtn.hidden = true;
  importPending = null;
  els.importReview.hidden = true;
  els.importPaste.hidden = true;
  redraw();
  setStatus(mode === 'replace' ? 'Backup replaced' : 'Backup merged');
}

async function doImport(text, mode) {
  const parsed = parseBackup(text);
  if (!parsed.ok) { setStatus(parsed.error); return; }
  const s = summaryOf(parsed.state);
  importPending = { state: parsed.state };
  els.importSummary.textContent = s.habits + ' habits, ' + s.checkIns + ' check-ins, last change ' + s.updatedAt;
  els.importReview.hidden = false;
  els.importPaste.hidden = true;
  // store previous state for undo (await so it's persisted before user chooses)
  await saveLastBeforeImport(state);
}

function undoImport() {
  loadLastBeforeImport().then((prev) => {
    if (!prev) return;
    state = prev;
    persist(state);
    clearLastBeforeImport();
    els.undoImportBtn.hidden = true;
    redraw();
    setStatus('Import undone');
  });
}

// ---------- backup UI ----------
$('exportBtn').addEventListener('click', async () => {
  const backup = exportBackup(state);
  const json = JSON.stringify(backup, null, 2);
  const fileName = 'daily-habit-log-' + dateKey(startOfToday()) + '.json';
  const method = await shareOrDownload(json, fileName);
  if (method === 'copy') {
    $('exportCopyText').value = json;
    els.exportCopy.hidden = false;
  }
  localStorage.setItem('daily-habit-log:lastExportAt', new Date().toISOString());
  localStorage.removeItem('daily-habit-log:exportSnoozedUntil');
  updateReminder();
  setStatus('Backup exported');
});
$('exportCopyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('exportCopyText').value); setStatus('Backup copied'); } catch (e) {}
  els.exportCopy.hidden = true;
});
$('exportCopyClose').addEventListener('click', () => { els.exportCopy.hidden = true; });

$('importBtn').addEventListener('click', () => { $('importFile').value = ''; $('importFile').click(); });
$('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => doImport(reader.result, null);
  reader.onerror = () => setStatus('That file could not be read.');
  reader.readAsText(file);
});

$('importPasteToggle').addEventListener('click', () => {
  els.importReview.hidden = true;
  els.importPaste.hidden = false;
  $('importPasteText').value = '';
  $('importPasteText').focus();
});
$('importPasteCancel').addEventListener('click', () => { els.importPaste.hidden = true; });
$('importPasteBtn').addEventListener('click', () => {
  doImport($('importPasteText').value, null);
});

$('importReplace').addEventListener('click', () => {
  if (!importPending) return;
  // two-step: replace requires confirmation
  const btn = $('importReplace');
  if (btn.dataset.armed === '1') {
    btn.dataset.armed = '0';
    btn.textContent = 'Replace everything';
    applyImported(importPending.state, 'replace');
  } else {
    btn.dataset.armed = '1';
    btn.textContent = 'Replace and cannot undo';
  }
});
$('importMerge').addEventListener('click', () => {
  if (!importPending) return;
  applyImported(importPending.state, 'merge');
});
$('importCancel').addEventListener('click', () => {
  importPending = null;
  els.importReview.hidden = true;
  setStatus('Import cancelled');
});
$('undoImportBtn').addEventListener('click', undoImport);

// ---------- 14-day backup reminder ----------
function updateReminder() {
  const lastExport = localStorage.getItem('daily-habit-log:lastExportAt');
  const snoozed = localStorage.getItem('daily-habit-log:exportSnoozedUntil');
  let checkIns = 0;
  for (const k of Object.keys(state.log)) checkIns += state.log[k].length;
  const show = checkIns >= 7 &&
    (!snoozed || new Date(snoozed) < new Date()) &&
    (!lastExport || new Date() - new Date(lastExport) >= 14 * 24 * 60 * 60 * 1000);
  els.backupReminder.hidden = !show;
}

$('dismissReminder').addEventListener('click', () => {
  els.backupReminder.hidden = true;
  localStorage.setItem('daily-habit-log:exportSnoozedUntil', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
});

// ---------- boot ----------
async function boot() {
  const loaded = await loadState();
  if (loaded) state = loaded;
  else {
    state = defaults();
    els.storageBanner.hidden = false;
  }
  subscribe((msg) => setStatus(msg));
  redraw();
  setStatus(isStorageAvailable() ? 'Saved' : 'Storage unavailable');
  updateReminder();
  initPWA();
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const cell = t.closest('[data-day]');
  if (cell) {
    if (cell.disabled) return;
    pendingDelete = null;
    toggle(cell.getAttribute('data-habit'), cell.getAttribute('data-day'));
    return;
  }
  const del = t.closest('[data-del]');
  if (del) {
    const id = del.getAttribute('data-del');
    if (pendingDelete === id) { pendingDelete = null; removeHabit(id); }
    else { pendingDelete = id; redraw(); }
    return;
  }
  if (t.closest('#editBtn')) { editing = !editing; pendingDelete = null; redraw(); return; }
  if (pendingDelete) { pendingDelete = null; redraw(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const inp = t.closest('[data-rename]');
  if (!inp) return;
  const id = inp.getAttribute('data-rename');
  const name = inp.value.trim().slice(0, 40);
  const h = state.habits.find((x) => x.id === id);
  if (!h) return;
  if (!name || name === h.name) { redraw(); return; }
  renameHabit(id, name);
});

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = $('newHabit');
  const name = inp.value.trim().slice(0, 40);
  if (!name) return;
  addHabit(name);
  inp.value = '';
  inp.focus();
});

document.addEventListener('pagehide', flushNow);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { flushNow(); }
  else {
    const d = startOfToday();
    if (dateKey(d) !== lastDay) { today = d; lastDay = dateKey(today); redraw(); updateReminder(); }
  }
});
setInterval(() => {
  const d = startOfToday();
  if (dateKey(d) !== lastDay) { today = d; lastDay = dateKey(today); redraw(); updateReminder(); }
}, 30000);

boot();
