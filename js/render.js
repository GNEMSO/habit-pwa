// Render: state -> DOM. Escapes every dynamic string. No app logic here.

import { dateKey, addDays, mondayOf } from './dates.js';
import { isDone, currentStreak, bestStreak, doneInLast, weekCells, historyGrid } from './stats.js';

const CHECK = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4.5 10.5l3.6 3.6 7.4-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const cssEscape = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (s) => String(s);

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cardHtml(h, state, t, editing, pendingDelete) {
  const tk = dateKey(t);
  const wk = mondayOf(t);
  let cells = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(wk, i);
    const k = dateKey(d);
    const future = d > t;
    const done = isDone(state, h.id, k);
    const isToday = k === tk;
    const full = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const letter = d.toLocaleDateString(undefined, { weekday: 'narrow' });
    const disabled = future ? ' disabled' : '';
    const content = done ? CHECK : '<span>' + esc(d.getDate()) + '</span>';
    cells += '<div class="day">' +
      '<span class="dl' + (isToday ? ' now' : '') + '">' + esc(letter) + '</span>' +
      '<button type="button" class="cell' + (done ? ' done' : '') + (isToday ? ' today' : '') + '"' +
      ' data-habit="' + esc(h.id) + '" data-day="' + esc(k) + '"' +
      ' aria-pressed="' + done + '"' +
      ' aria-label="' + esc(h.name + ', ' + full) + '"' + disabled + '>' + content + '</button>' +
      '</div>';
  }
  const s = currentStreak(state, h.id, t);
  let head;
  if (editing) {
    const armed = pendingDelete === h.id;
    head = '<div class="card-head">' +
      '<input class="rename" id="rename-' + esc(h.id) + '" data-rename="' + esc(h.id) + '" type="text" maxlength="40" value="' + esc(h.name) + '" aria-label="Habit name">' +
      '<button type="button" class="del' + (armed ? ' armed' : '') + '" data-del="' + esc(h.id) + '">' + (armed ? 'Tap again to delete' : 'Delete') + '</button></div>';
  } else {
    head = '<div class="card-head"><h2>' + esc(h.name) + '</h2>' +
      '<p class="streak"><b>' + esc(s) + '</b><span>day streak</span></p></div>';
  }
  return '<article class="card">' + head +
    '<div class="week">' + cells + '</div>' +
    '<p class="stats"><span>Best streak <b>' + esc(bestStreak(state, h.id)) + '</b></span>' +
    '<span>Last 30 days <b>' + esc(doneInLast(state, h.id, 30, t)) + '</b>/30</span></p></article>';
}

function historyHtml(state, t) {
  return state.habits.map((h) => {
    const g = historyGrid(state, h.id, t);
    const cells = g.cells.map((c) => '<i class="' + (c.future ? 'f' : (c.done ? 'on' : '')) + '"></i>').join('');
    return '<div class="hist-row">' +
      '<div class="heat" role="img" aria-label="' + esc(h.name + ': ' + g.done + ' of ' + g.total + ' days done in the last 12 weeks') + '">' + cells + '</div>' +
      '<div class="hist-label"><p class="n">' + esc(h.name) + '</p><p class="c">' + esc(g.done) + ' of ' + esc(g.total) + ' days</p></div></div>';
  }).join('');
}

export function render(state, ctx, els) {
  const { today, editing, pendingDelete, lastFocus } = ctx;
  const t = today;
  const tk = dateKey(t);

  els.dateLabel.textContent = t.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const n = state.habits.length;
  let done = 0;
  for (const h of state.habits) if (isDone(state, h.id, tk)) done++;
  els.barFill.style.width = n ? Math.round(done / n * 100) + '%' : '0%';
  els.progressText.textContent = n === 0
    ? 'No habits yet'
    : (done === n ? 'All ' + n + ' done today' : done + ' of ' + n + ' done today');

  els.habits.innerHTML = n
    ? state.habits.map((h) => cardHtml(h, state, t, editing, pendingDelete)).join('')
    : '<div class="card empty"><p>No habits yet. Choose Edit habits to add your first one.</p></div>';
  els.historySection.hidden = n === 0;
  els.history.innerHTML = n ? historyHtml(state, t) : '';

  els.editBtn.textContent = editing ? 'Done editing' : 'Edit habits';
  els.editBtn.setAttribute('aria-pressed', editing ? 'true' : 'false');
  els.addForm.hidden = !editing;

  if (lastFocus) {
    const el = els.habits.querySelector('[data-habit="' + cssEscape(lastFocus[0]) + '"][data-day="' + cssEscape(lastFocus[1]) + '"]');
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }
}
