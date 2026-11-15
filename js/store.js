// Persistence: IndexedDB (primary), localStorage (fallback), in-memory (last resort).
// Debounced ~400 ms serialized writes; flush on pagehide / hidden. Emits status strings.
import { normalizeState } from './backup.js';

const DB_NAME = 'daily-habit-log';
const DB_VERSION = 1;
const STORE = 'kv';
const LS_KEY = 'daily-habit-log:v1';
const DEBOUNCE_MS = 400;

let mode = 'idb';
let memoryState = null;
let lastBeforeImportMemory = null;
let timer = null;
let writing = false;
let dirty = false;
let pending = null;
let retried = false;
let persistDone = false;
let statusHandler = null;
const subscribers = [];

export function setStatusHandler(fn) { statusHandler = fn; }
export function subscribe(fn) { subscribers.push(fn); }
export function storageMode() { return mode; }
export function isStorageAvailable() { return mode !== 'memory'; }
export function getMemoryState() { return memoryState; }

function emit(msg) {
  if (statusHandler) statusHandler(msg);
  for (const fn of subscribers) fn(msg);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readIdb() {
  const dbase = await openDb();
  const val = await new Promise((res, rej) => {
    const r = dbase.transaction([STORE], 'readonly').objectStore(STORE).get('state');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  dbase.close();
  return val;
}

async function writeIdb(s) {
  const dbase = await openDb();
  await new Promise((res, rej) => {
    const tx = dbase.transaction([STORE], 'readwrite');
    tx.objectStore(STORE).put(s, 'state');
    tx.oncomplete = () => { dbase.close(); res(); };
    tx.onerror = () => { dbase.close(); rej(tx.error); };
  });
}

// Best-effort record of the raw value when state fails to load cleanly.
export async function saveCorruptBackup(raw) {
  try {
    if (typeof indexedDB === 'undefined') return;
    const dbase = await openDb();
    await new Promise((res, rej) => {
      const tx = dbase.transaction([STORE], 'readwrite');
      tx.objectStore(STORE).put(raw, 'corruptBackup');
      tx.oncomplete = () => { dbase.close(); res(); };
      tx.onerror = () => { dbase.close(); rej(tx.error); };
    });
  } catch (e) { /* ignore */ }
}

export async function loadState() {
  // 1. IndexedDB
  try {
    if (typeof indexedDB !== 'undefined') {
      const val = await readIdb();
      mode = 'idb';
      if (val && val.state !== undefined) {
        const norm = normalizeState(val.state);
        if (val.state && (val.state.habits || val.state.log) && norm.habits.length === 0 && Object.keys(norm.log).length === 0) {
          await saveCorruptBackup(val.state);
        }
        return norm;
      }
    }
  } catch (e) { mode = 'idb'; }

  // 2. localStorage
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      mode = 'ls';
      return normalizeState(JSON.parse(raw));
    }
  } catch (e) { mode = 'ls'; }

  // 3. In-memory fallback with banner
  mode = 'memory';
  return null;
}

async function doWrite(s) {
  if (mode === 'idb') await writeIdb(s);
  else if (mode === 'ls') localStorage.setItem(LS_KEY, JSON.stringify(s));
  else memoryState = s;
}

export function saveStateDebounced(s) {
  pending = s;
  dirty = true;
  emit('Saving');
  clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
}

function flush() {
  if (writing || !dirty) return;
  const s = pending;
  if (!s) { dirty = false; return; }
  pending = null;
  dirty = false;
  writing = true;
  emit('Saving');
  doWrite(s).then(() => {
    writing = false;
    if (!persistDone && typeof navigator.storage !== 'undefined' && typeof navigator.storage.persist === 'function') {
      persistDone = true;
      navigator.storage.persist();
    }
    if (dirty) flush();
    else emit('Saved');
  }).catch(() => {
    writing = false;
    if (!retried) {
      retried = true;
      dirty = true;
      pending = s;
      emit('Could not save. Retrying.');
      setTimeout(flush, 1500 + Math.random() * 1000);
    } else {
      retried = false;
      emit('Not saved');
    }
  });
}

export function flushNow() {
  clearTimeout(timer);
  if (dirty) flush();
}

export function requestPersistence() {
  if (typeof navigator.storage !== 'undefined' && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist();
  }
}

async function writeLastBeforeImport(s) {
  if (typeof indexedDB !== 'undefined') {
    const dbase = await openDb();
    await new Promise((res, rej) => {
      const tx = dbase.transaction([STORE], 'readwrite');
      tx.objectStore(STORE).put(s, 'lastBeforeImport');
      tx.oncomplete = () => { dbase.close(); res(); };
      tx.onerror = () => { dbase.close(); rej(tx.error); };
    });
  } else if (mode === 'ls') {
    localStorage.setItem('daily-habit-log:lastBeforeImport', JSON.stringify(s));
  } else {
    lastBeforeImportMemory = s;
  }
}

async function readLastBeforeImport() {
  if (typeof indexedDB !== 'undefined') {
    try {
      const dbase = await openDb();
      const val = await new Promise((res, rej) => {
        const r = dbase.transaction([STORE], 'readonly').objectStore(STORE).get('lastBeforeImport');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      dbase.close();
      return val;
    } catch (e) { return null; }
  }
  if (mode === 'ls') {
    try { return JSON.parse(localStorage.getItem('daily-habit-log:lastBeforeImport') || 'null'); } catch (e) { return null; }
  }
  return lastBeforeImportMemory;
}

export async function saveLastBeforeImport(s) { await writeLastBeforeImport(s); }
export async function loadLastBeforeImport() { return readLastBeforeImport(); }
export async function clearLastBeforeImport() {
  if (typeof indexedDB !== 'undefined') {
    const dbase = await openDb();
    await new Promise((res, rej) => {
      const tx = dbase.transaction([STORE], 'readwrite');
      tx.objectStore(STORE).delete('lastBeforeImport');
      tx.oncomplete = () => { dbase.close(); res(); };
      tx.onerror = () => { dbase.close(); rej(tx.error); };
    });
  } else if (mode === 'ls') {
    localStorage.removeItem('daily-habit-log:lastBeforeImport');
  } else {
    lastBeforeImportMemory = null;
  }
}
