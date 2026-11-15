import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, parseBackup, normalizeState } from '../js/backup.js';

test('round trip: export then parse gives an equal state', () => {
  const state = { v: 1, habits: [{ id: 'h1', name: 'Exercise' }], log: { '2026-11-14': ['h1'] }, updatedAt: 123 };
  const backup = exportBackup(state);
  const text = JSON.stringify(backup, null, 2);
  const parsed = parseBackup(text);
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.state.habits, state.habits);
  assert.deepStrictEqual(parsed.state.log, state.log);
  assert.strictEqual(parsed.state.updatedAt, 123);
});

test('rejects invalid JSON', () => {
  const p = parseBackup('not json');
  assert.strictEqual(p.ok, false);
  assert.ok(/valid JSON/.test(p.error));
});

test('rejects wrong app', () => {
  const p = parseBackup(JSON.stringify({ app: 'other', schema: 1, state: { habits: [], log: {} } }));
  assert.strictEqual(p.ok, false);
  assert.ok(/Daily Habit Log backup/.test(p.error));
});

test('rejects newer schema', () => {
  const p = parseBackup(JSON.stringify({ app: 'daily-habit-log', schema: 2, state: { habits: [], log: {} } }));
  assert.strictEqual(p.ok, false);
  assert.ok(/newer version/.test(p.error));
});

test('normalization removes junk: non-string ids, bad date keys, unknown ids, duplicates, empty days', () => {
  const text = JSON.stringify({
    app: 'daily-habit-log',
    schema: 1,
    state: {
      habits: [
        { id: 123, name: 'Bad' },
        { id: 'h1', name: 'Good' },
        { id: 'h1', name: 'Dup' }
      ],
      log: {
        '2026-11-14': ['h1', 'h1', 'unknown'],
        'not-a-date': ['h1'],
        '2026-11-13': 'notarray'
      }
    }
  });
  const p = parseBackup(text);
  assert.strictEqual(p.ok, true);
  assert.deepStrictEqual(p.state.habits, [{ id: 'h1', name: 'Good' }]);
  assert.deepStrictEqual(p.state.log, { '2026-11-14': ['h1'] });
});

test('accepts a bare state object', () => {
  const p = parseBackup(JSON.stringify({ habits: [{ id: 'h1', name: 'H' }], log: { '2026-11-14': ['h1'] } }));
  assert.strictEqual(p.ok, true);
  assert.deepStrictEqual(p.state.habits, [{ id: 'h1', name: 'H' }]);
});

test('very large input normalizes quickly and stays under 256 KB serialized', () => {
  const habits = [];
  for (let i = 0; i < 20; i++) habits.push({ id: 'h' + i, name: 'Habit ' + i });
  const log = {};
  for (let y = 2016; y < 2022; y++) { // 6 years of daily data x 20 habits (large; stays under 256 KB)
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        log[k] = habits.map((h) => h.id);
      }
    }
  }
  const start = Date.now();
  const p = parseBackup(JSON.stringify({ app: 'daily-habit-log', schema: 1, state: { v: 1, habits, log, updatedAt: 0 } }));
  const elapsed = Date.now() - start;
  assert.ok(p.ok, p.error);
  assert.ok(elapsed < 200, 'took ' + elapsed + ' ms');
  const serialized = JSON.stringify(p.state);
  assert.ok(serialized.length < 256 * 1024, 'serialized ' + serialized.length + ' bytes');
});

test('normalizeState never throws on weird input', () => {
  assert.doesNotThrow(() => normalizeState(null));
  assert.doesNotThrow(() => normalizeState(undefined));
  assert.doesNotThrow(() => normalizeState('string'));
  assert.doesNotThrow(() => normalizeState([1, 2]));
  assert.deepStrictEqual(normalizeState({}), { v: 1, habits: [], log: {}, updatedAt: 0 });
});
