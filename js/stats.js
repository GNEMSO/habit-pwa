// Pure stats: streaks, last-N, week row, history grid. No DOM, no clock access.
// `today` must be a local-date Date (caller passes startOfToday).

import {
  dateKey, addDays, startOfToday, mondayOf, dayNumber
} from './dates.js';

export function isDone(state, habitId, key) {
  const a = state.log[key];
  return !!a && a.indexOf(habitId) > -1;
}

export function currentStreak(state, habitId, today) {
  let d = startOfToday(today);
  if (!isDone(state, habitId, dateKey(d))) d = addDays(d, -1);
  let n = 0;
  while (isDone(state, habitId, dateKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function bestStreak(state, habitId) {
  const nums = Object.keys(state.log)
    .filter((k) => isDone(state, habitId, k))
    .map(dayNumber)
    .sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const n of nums) {
    run = (prev !== null && n === prev + 1) ? run + 1 : 1;
    if (run > best) best = run;
    prev = n;
  }
  return best;
}

export function doneInLast(state, habitId, days, today) {
  const t = startOfToday(today);
  let c = 0;
  for (let i = 0; i < days; i++) {
    if (isDone(state, habitId, dateKey(addDays(t, -i)))) c++;
  }
  return c;
}

export function weekCells(state, habitId, today) {
  const t = startOfToday(today);
  const tk = dateKey(t);
  const wk = mondayOf(t);
  const cells = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(wk, i);
    const k = dateKey(d);
    cells.push({
      key: k,
      date: d,
      done: isDone(state, habitId, k),
      future: d > t,
      isToday: k === tk
    });
  }
  return cells;
}

export function historyGrid(state, habitId, today, weeks = 12) {
  const t = startOfToday(today);
  const start = addDays(mondayOf(t), -7 * (weeks - 1));
  const cells = [];
  let done = 0, total = 0;
  for (let w = 0; w < weeks; w++) {
    for (let r = 0; r < 7; r++) {
      const d = addDays(start, w * 7 + r);
      if (d > t) {
        cells.push({ key: dateKey(d), date: d, done: false, future: true });
        continue;
      }
      total++;
      const k = dateKey(d);
      const isD = isDone(state, habitId, k);
      if (isD) done++;
      cells.push({ key: k, date: d, done: isD, future: false });
    }
  }
  return { cells, done, total };
}
