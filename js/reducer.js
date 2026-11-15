// Pure reducer: (state, action, now) -> new state. Never mutates input.
// Actions: TOGGLE_DAY, ADD_HABIT, RENAME_HABIT, DELETE_HABIT, IMPORT_STATE

function cloneState(state) {
  const next = {
    v: state.v,
    habits: state.habits.map((h) => ({ id: h.id, name: h.name })),
    log: {},
    updatedAt: state.updatedAt
  };
  for (const k of Object.keys(state.log)) next.log[k] = state.log[k].slice();
  return next;
}

function setUpdatedAt(state, now) {
  const next = cloneState(state);
  next.updatedAt = now;
  return next;
}

export function reduce(state, action, now = Date.now()) {
  switch (action.type) {
    case 'TOGGLE_DAY': return toggleDay(state, action, now);
    case 'ADD_HABIT': return addHabit(state, action, now);
    case 'RENAME_HABIT': return renameHabit(state, action, now);
    case 'DELETE_HABIT': return deleteHabit(state, action, now);
    case 'IMPORT_STATE': return importState(state, action, now);
    default: return state;
  }
}

function toggleDay(state, action, now) {
  const k = action.key;
  const prev = state.log[k] ? state.log[k].slice() : [];
  const i = prev.indexOf(action.habitId);
  let changed = false;
  if (i > -1) { prev.splice(i, 1); changed = true; }
  else { prev.push(action.habitId); changed = true; }
  if (!changed) return state;
  const next = cloneState(state);
  if (prev.length === 0) delete next.log[k];
  else next.log[k] = prev;
  return setUpdatedAt(next, now);
}

function addHabit(state, action, now) {
  const name = String(action.name || '').trim().slice(0, 40);
  if (!name) return state;
  if (state.habits.length >= 20) return state;
  const next = cloneState(state);
  next.habits.push({ id: action.id, name });
  return setUpdatedAt(next, now);
}

function renameHabit(state, action, now) {
  const h = state.habits.find((x) => x.id === action.id);
  if (!h) return state;
  const name = String(action.name || '').trim().slice(0, 40);
  if (!name || name === h.name) return state;
  const next = cloneState(state);
  const t = next.habits.find((x) => x.id === action.id);
  t.name = name;
  return setUpdatedAt(next, now);
}

function deleteHabit(state, action, now) {
  if (!state.habits.some((h) => h.id === action.id)) return state;
  const next = cloneState(state);
  next.habits = next.habits.filter((h) => h.id !== action.id);
  for (const k of Object.keys(next.log)) {
    const a = next.log[k].filter((x) => x !== action.id);
    if (a.length) next.log[k] = a;
    else delete next.log[k];
  }
  return setUpdatedAt(next, now);
}

function mergeHabits(cur, imp) {
  const next = cloneState(cur);
  const curIds = new Set(next.habits.map((h) => h.id));
  for (const h of imp.habits) {
    if (!curIds.has(h.id)) {
      next.habits.push({ id: h.id, name: h.name });
      curIds.add(h.id);
    }
  }
  const log = {};
  for (const k of Object.keys(cur.log)) log[k] = cur.log[k].slice();
  for (const k of Object.keys(imp.log)) {
    const curA = log[k] ? log[k] : [];
    const set = new Set(curA);
    for (const id of imp.log[k]) {
      if (!set.has(id)) { set.add(id); curA.push(id); }
    }
    if (curA.length) log[k] = curA;
    else delete log[k];
  }
  next.log = log;
  return next;
}

function importState(state, action, now) {
  const incoming = action.state;
  const next = action.mode === 'merge' ? mergeHabits(state, incoming) : cloneState(incoming);
  next.updatedAt = now;
  return next;
}
