import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduce } from '../js/reducer.js';

const base = {
  v: 1,
  habits: [{ id: 'h1', name: 'One' }, { id: 'h2', name: 'Two' }],
  log: { '2026-11-14': ['h1'] },
  updatedAt: 1000
};

test('TOGGLE_DAY adds then removes; empty day arrays deleted; new object; input not mutated', () => {
  const before = JSON.parse(JSON.stringify(base));
  // base log: 2026-11-14: ['h1']
  let s = reduce(base, { type: 'TOGGLE_DAY', habitId: 'h2', key: '2026-11-14' }, 2000);
  assert.strictEqual(s.updatedAt, 2000);
  assert.deepStrictEqual(s.log['2026-11-14'], ['h1', 'h2']);
  assert.notStrictEqual(s, base);
  assert.deepStrictEqual(base, before); // input not mutated
  // remove h1 -> day becomes ['h2'] (not empty, kept)
  s = reduce(s, { type: 'TOGGLE_DAY', habitId: 'h1', key: '2026-11-14' }, 3000);
  assert.deepStrictEqual(s.log['2026-11-14'], ['h2']);
  assert.strictEqual(s.updatedAt, 3000);
  // remove h2 -> day empty -> deleted
  s = reduce(s, { type: 'TOGGLE_DAY', habitId: 'h2', key: '2026-11-14' }, 4000);
  assert.deepStrictEqual(s.log, {});
  // re-add
  s = reduce(s, { type: 'TOGGLE_DAY', habitId: 'h2', key: '2026-11-14' }, 5000);
  assert.deepStrictEqual(s.log['2026-11-14'], ['h2']);
});

test('TOGGLE_DAY toggling a done habit off removes it and updates updatedAt', () => {
  const s = reduce(base, { type: 'TOGGLE_DAY', habitId: 'h1', key: '2026-11-14' }, 5000);
  assert.strictEqual(s.updatedAt, 5000);
  assert.deepStrictEqual(s.log, {});
});

test('ADD_HABIT trims, truncates to 40, ignores empty, enforces 20 limit', () => {
  let s = reduce(base, { type: 'ADD_HABIT', id: 'h3', name: '  Run  ' }, 2000);
  assert.deepStrictEqual(s.habits.find((h) => h.id === 'h3').name, 'Run');

  s = reduce(s, { type: 'ADD_HABIT', id: 'h4', name: 'x'.repeat(50) }, 3000);
  assert.strictEqual(s.habits.find((h) => h.id === 'h4').name.length, 40);

  s = reduce(s, { type: 'ADD_HABIT', id: 'h5', name: '   ' }, 4000);
  assert.strictEqual(s.habits.length, 4); // empty ignored
});

test('ADD_HABIT enforces 20 habit limit', () => {
  let s = base;
  for (let i = 0; i < 18; i++) {
    s = reduce(s, { type: 'ADD_HABIT', id: 'h' + (10 + i), name: 'H' + (10 + i) }, 1000 + i);
  }
  assert.strictEqual(s.habits.length, 20);
  const s2 = reduce(s, { type: 'ADD_HABIT', id: 'h99', name: 'Too many' }, 9000);
  assert.strictEqual(s2.habits.length, 20);
  assert.strictEqual(s2, s); // no change
});

test('RENAME_HABIT trims, ignores empty and unchanged', () => {
  let s = reduce(base, { type: 'RENAME_HABIT', id: 'h1', name: '  Run  ' }, 2000);
  assert.strictEqual(s.habits[0].name, 'Run');
  assert.strictEqual(s.updatedAt, 2000);

  s = reduce(s, { type: 'RENAME_HABIT', id: 'h1', name: '   ' }, 3000);
  assert.strictEqual(s.habits[0].name, 'Run');
  assert.strictEqual(s.updatedAt, 2000); // empty ignored, not updated

  const s2 = reduce(s, { type: 'RENAME_HABIT', id: 'h1', name: 'Run' }, 4000);
  assert.strictEqual(s2, s); // unchanged -> same object, updatedAt untouched
});

test('DELETE_HABIT removes the habit and every check-in for it', () => {
  const s = {
    v: 1, habits: [{ id: 'h1', name: 'One' }],
    log: { '2026-11-14': ['h1'], '2026-11-13': ['h1', 'h2'] },
    updatedAt: 1000
  };
  const out = reduce(s, { type: 'DELETE_HABIT', id: 'h1' }, 2000);
  assert.deepStrictEqual(out.habits, []);
  assert.deepStrictEqual(out.log, { '2026-11-13': ['h2'] });
  assert.strictEqual(out.updatedAt, 2000);
});

test('IMPORT_STATE replace', () => {
  const imp = { v: 1, habits: [{ id: 'h3', name: 'Three' }], log: { '2026-11-14': ['h3'] }, updatedAt: 500 };
  const s = reduce(base, { type: 'IMPORT_STATE', state: imp, mode: 'replace' }, 7000);
  assert.deepStrictEqual(s.habits, imp.habits);
  assert.deepStrictEqual(s.log, imp.log);
  assert.strictEqual(s.updatedAt, 7000);
});

test('IMPORT_STATE merge keeps existing names and unions check-ins', () => {
  const imp = {
    v: 1,
    habits: [{ id: 'h1', name: 'New Name' }, { id: 'h3', name: 'Three' }],
    log: { '2026-11-15': ['h1', 'h3'] },
    updatedAt: 500
  };
  const s = reduce(base, { type: 'IMPORT_STATE', state: imp, mode: 'merge' }, 8000);
  assert.strictEqual(s.habits.find((h) => h.id === 'h1').name, 'One'); // existing name wins
  assert.ok(s.habits.some((h) => h.id === 'h3')); // new habit added
  assert.deepStrictEqual(s.log['2026-11-15'], ['h1', 'h3']); // union of check-ins
  assert.deepStrictEqual(s.log['2026-11-14'], ['h1']); // existing kept
  assert.strictEqual(s.updatedAt, 8000);
});

test('updatedAt equals the injected now after every change', () => {
  const s = reduce(base, { type: 'TOGGLE_DAY', habitId: 'h2', key: '2026-11-14' }, 424242);
  assert.strictEqual(s.updatedAt, 424242);
});
