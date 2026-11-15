import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey, parseKey, addDays, startOfToday, mondayOf, dayNumber
} from '../js/dates.js';

test('dateKey pads month and day', () => {
  assert.strictEqual(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.strictEqual(dateKey(new Date(2026, 11, 9)), '2026-12-09');
});

test('parseKey returns local midnight', () => {
  const d = parseKey('2026-11-14');
  assert.strictEqual(dateKey(d), '2026-11-14');
  assert.strictEqual(d.getHours(), 0);
  assert.strictEqual(d.getMinutes(), 0);
});

test('addDays across month end', () => {
  assert.strictEqual(dateKey(addDays(new Date(2026, 0, 31), 1)), '2026-02-01');
});

test('addDays across year end', () => {
  assert.strictEqual(dateKey(addDays(new Date(2026, 11, 31), 1)), '2027-01-01');
});

test('addDays across leap day 2028-02-28 +1', () => {
  assert.strictEqual(dateKey(addDays(new Date(2028, 1, 28), 1)), '2028-02-29');
});

test('addDays across leap day 2028-02-28 +2', () => {
  assert.strictEqual(dateKey(addDays(new Date(2028, 1, 28), 2)), '2028-03-01');
});

test('addDays DST safe: day before spring forward gives next calendar date', () => {
  assert.strictEqual(dateKey(addDays(new Date(2026, 2, 7), 1)), '2026-03-08');
});

test('mondayOf for every weekday including Sunday', () => {
  const sat = new Date(2026, 10, 14); // 2026-11-14 Saturday
  assert.strictEqual(dateKey(mondayOf(sat)), '2026-11-09');
  const sun = new Date(2026, 10, 15); // Sunday belongs to previous Monday's week
  assert.strictEqual(dateKey(mondayOf(sun)), '2026-11-09');
  const mon = new Date(2026, 10, 9);
  assert.strictEqual(dateKey(mondayOf(mon)), '2026-11-09');
  const tue = new Date(2026, 10, 10);
  assert.strictEqual(dateKey(mondayOf(tue)), '2026-11-09');
});

test('dayNumber differs by exactly 1 for consecutive dates', () => {
  assert.strictEqual(dayNumber('2026-11-14') - dayNumber('2026-11-13'), 1);
  assert.strictEqual(dayNumber('2026-02-28') - dayNumber('2026-02-27'), 1);
  assert.strictEqual(dayNumber('2028-03-01') - dayNumber('2028-02-29'), 1);
});

test('dayNumber across DST change differs by exactly 1', () => {
  assert.strictEqual(dayNumber('2026-03-07') + 1, dayNumber('2026-03-08'));
  assert.strictEqual(dayNumber('2026-03-08') + 1, dayNumber('2026-03-09'));
});
