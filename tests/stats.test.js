import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDone, currentStreak, bestStreak, doneInLast, weekCells, historyGrid
} from '../js/stats.js';
import { startOfToday } from '../js/dates.js';

function stateWith(log) {
  return { v: 1, habits: [{ id: 'h1', name: 'H' }], log, updatedAt: 0 };
}
const TODAY = new Date(2026, 10, 14); // 2026-11-14 Saturday

test('streak table FR-3', () => {
  // D, D-1, D-2 -> 3
  assert.strictEqual(
    currentStreak(stateWith({ '2026-11-14': ['h1'], '2026-11-13': ['h1'], '2026-11-12': ['h1'] }), 'h1', TODAY),
    3
  );
  // D-1, D-2, D-3 (today not done) -> 3
  assert.strictEqual(
    currentStreak(stateWith({ '2026-11-13': ['h1'], '2026-11-12': ['h1'], '2026-11-11': ['h1'] }), 'h1', TODAY),
    3
  );
  // D, D-2 -> 1
  assert.strictEqual(
    currentStreak(stateWith({ '2026-11-14': ['h1'], '2026-11-12': ['h1'] }), 'h1', TODAY),
    1
  );
  // D-2 only -> 0
  assert.strictEqual(currentStreak(stateWith({ '2026-11-12': ['h1'] }), 'h1', TODAY), 0);
  // none -> 0
  assert.strictEqual(currentStreak(stateWith({}), 'h1', TODAY), 0);
});

test('streak when today not done and yesterday done', () => {
  assert.strictEqual(currentStreak(stateWith({ '2026-11-13': ['h1'] }), 'h1', TODAY), 1);
});

test('bestStreak with multiple runs, a run of 1, and an empty log', () => {
  const s = stateWith({
    '2026-11-01': ['h1'], '2026-11-02': ['h1'], '2026-11-03': ['h1'],
    '2026-11-10': ['h1'], '2026-11-11': ['h1']
  });
  assert.strictEqual(bestStreak(s, 'h1'), 3);
  assert.strictEqual(bestStreak(stateWith({ '2026-11-05': ['h1'] }), 'h1'), 1);
  assert.strictEqual(bestStreak(stateWith({}), 'h1'), 0);
});

test('bestStreak crosses a daylight saving change (dayNumber based)', () => {
  const s = stateWith({
    '2026-03-07': ['h1'], '2026-03-08': ['h1'], '2026-03-09': ['h1']
  });
  assert.strictEqual(bestStreak(s, 'h1'), 3);
});

test('doneInLast includes today and excludes day 31', () => {
  const s = stateWith({ '2026-11-14': ['h1'], '2026-10-15': ['h1'] });
  assert.strictEqual(doneInLast(s, 'h1', 30, TODAY), 1);
  assert.strictEqual(doneInLast(s, 'h1', 31, TODAY), 2);
});

test('weekCells has exactly 7 items, marks today, marks future cells', () => {
  const cells = weekCells(stateWith({ '2026-11-14': ['h1'] }), 'h1', TODAY);
  assert.strictEqual(cells.length, 7);
  assert.strictEqual(cells[0].key, '2026-11-09'); // Monday
  assert.strictEqual(cells[6].key, '2026-11-15'); // Sunday
  const todayCell = cells.find((c) => c.isToday);
  assert.strictEqual(todayCell.key, '2026-11-14');
  assert.strictEqual(todayCell.done, true);
  assert.strictEqual(cells[0].future, false); // Monday Nov 9 is in the past
  assert.strictEqual(cells[6].future, true);  // Sunday Nov 15 is future
});

test('historyGrid returns 84 cells, right-most column is current week', () => {
  const g = historyGrid(stateWith({}), 'h1', TODAY);
  assert.strictEqual(g.cells.length, 84);
  const lastWeek = g.cells.slice(77);
  assert.strictEqual(lastWeek[0].key, '2026-11-09'); // current week Monday
  assert.strictEqual(lastWeek[6].key, '2026-11-15'); // current week Sunday
  assert.strictEqual(lastWeek[5].future, false); // today Nov 14
  assert.strictEqual(lastWeek[6].future, true);  // Nov 15 future
  assert.strictEqual(g.done, 0);
  assert.strictEqual(g.total, 84 - 1); // one future cell (Sunday)
});

test('historyGrid total: Monday leaves 6 future cells, Sunday leaves 0', () => {
  const mon = new Date(2026, 10, 9);
  const gm = historyGrid(stateWith({}), 'h1', mon);
  assert.strictEqual(gm.cells.slice(77).filter((c) => c.future).length, 6);
  assert.strictEqual(gm.total, 78);

  const sun = new Date(2026, 10, 15);
  const gs = historyGrid(stateWith({}), 'h1', sun);
  assert.strictEqual(gs.cells.slice(77).filter((c) => c.future).length, 0);
  assert.strictEqual(gs.total, 84);
});

test('historyGrid counts done cells', () => {
  const g = historyGrid(stateWith({ '2026-11-09': ['h1'], '2026-11-14': ['h1'] }), 'h1', TODAY);
  assert.strictEqual(g.done, 2);
});
