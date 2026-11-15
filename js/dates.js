// Pure local-date helpers. No DOM, no timezone libraries. All inputs/outputs use
// the device's local calendar time. Weeks start on Monday.

const DAY_MS = 86400000;

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// Date -> 'YYYY-MM-DD' in local time
export function dateKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 'YYYY-MM-DD' -> Date at local midnight
export function parseKey(k) {
  const p = k.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

// Calendar days, DST-safe (month/date roll over via the Date constructor)
export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Local midnight for the given now (default: now)
export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Monday of d's week
export function mondayOf(d) {
  return addDays(d, -((d.getDay() + 6) % 7));
}

// Integer day index via Date.UTC; consecutive dates differ by exactly 1,
// including across daylight saving changes.
export function dayNumber(k) {
  const p = k.split('-');
  return Math.round(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) / DAY_MS);
}
