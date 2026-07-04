import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock so `npm run dev` isn't empty.
const MOCK_GET = {
  alarms: [
    { id: 1, hour: 7, min: 0, label: '', enabled: false },
    { id: 2, hour: 10, min: 0, label: '', enabled: true },
    { id: 3, hour: 12, min: 30, label: '', enabled: false },
  ],
  timer: null,
  recents: [
    { h: 0, m: 5, s: 0 },
    { h: 0, m: 15, s: 0 },
    { h: 1, m: 0, s: 0 },
  ],
  alarmRingtone: '',
  alarmTones: [{ id: 'default', name: 'Alarm', url: './audio/alarm.mp3', builtin: true }],
  now: Math.floor(Date.now() / 1000),
};

// Convert the server's timer (absolute epoch `endsAt`) into a client-anchored one
// (a `deadline` in local ms), so the countdown is immune to server/client skew.
function localizeTimer(timer, serverNow) {
  if (!timer) return null;
  if (timer.paused) {
    return {
      total: timer.total,
      label: timer.label || '',
      fromRecent: !!timer.fromRecent,
      paused: true,
      remaining: Math.max(0, timer.remaining || 0),
      deadline: null,
    };
  }
  const remain = Math.max(0, (timer.endsAt || serverNow) - serverNow);
  return {
    total: timer.total,
    label: timer.label || '',
    fromRecent: !!timer.fromRecent,
    paused: false,
    remaining: remain,
    deadline: Date.now() + remain * 1000,
  };
}

const initialState = {
  loaded: false,
  alarms: [],
  timer: null, // { total, label, fromRecent, paused, remaining, deadline }
  recents: [],
  alarmRingtone: '',
  alarmTones: [],
  ringing: null, // { kind: 'alarm'|'timer', label, hour, min, total }
  stopwatch: { running: false, startedAt: 0, elapsed: 0, laps: [] },
};

const clockSlice = createSlice({
  name: 'clock',
  initialState,
  reducers: {
    hydrateClock(state, action) {
      const p = action.payload || {};
      state.alarms = p.alarms || [];
      state.recents = p.recents || [];
      state.alarmRingtone = p.alarmRingtone || '';
      state.alarmTones = p.alarmTones || [];
      state.timer = localizeTimer(p.timer, p.now || Math.floor(Date.now() / 1000));
      state.loaded = true;
    },

    // ---- alarms ----
    upsertAlarm(state, action) {
      const a = action.payload;
      if (!a) return;
      const i = state.alarms.findIndex((x) => x.id === a.id);
      if (i >= 0) state.alarms[i] = a;
      else state.alarms.push(a);
    },
    setAlarmEnabled(state, action) {
      const { id, enabled } = action.payload;
      const a = state.alarms.find((x) => x.id === id);
      if (a) a.enabled = enabled;
    },
    removeAlarm(state, action) {
      state.alarms = state.alarms.filter((x) => x.id !== action.payload);
    },

    // ---- timer ----
    setTimerLocal(state, action) {
      state.timer = action.payload;
    },
    setRecents(state, action) {
      state.recents = action.payload || [];
    },

    // ---- ringing overlay ----
    setRinging(state, action) {
      state.ringing = action.payload || null;
    },

    // ---- alarm sounds (settings) ----
    setAlarmRingtone(state, action) {
      state.alarmRingtone = action.payload || '';
    },
    addAlarmToneLocal(state, action) {
      if (action.payload) state.alarmTones.push(action.payload);
    },
    removeAlarmToneLocal(state, action) {
      const url = (state.alarmTones.find((t) => t.id === action.payload) || {}).url;
      state.alarmTones = state.alarmTones.filter((t) => t.id !== action.payload);
      if (url && state.alarmRingtone === url) state.alarmRingtone = '';
    },

    // ---- stopwatch (local only) ----
    swStart(state) {
      state.stopwatch.running = true;
      state.stopwatch.startedAt = Date.now();
    },
    swStop(state) {
      const sw = state.stopwatch;
      if (sw.running) {
        sw.elapsed += Date.now() - sw.startedAt;
        sw.running = false;
      }
    },
    swReset(state) {
      state.stopwatch = { running: false, startedAt: 0, elapsed: 0, laps: [] };
    },
    swLap(state) {
      const sw = state.stopwatch;
      const total = sw.elapsed + (sw.running ? Date.now() - sw.startedAt : 0);
      sw.laps.unshift(total);
    },
  },
});

export const {
  hydrateClock,
  upsertAlarm,
  setAlarmEnabled,
  removeAlarm,
  setTimerLocal,
  setRecents,
  setRinging,
  setAlarmRingtone,
  addAlarmToneLocal,
  removeAlarmToneLocal,
  swStart,
  swStop,
  swReset,
  swLap,
} = clockSlice.actions;

// ---- Thunks ---------------------------------------------------------------

export const loadClock = () => async (dispatch) => {
  const res = await fetchNui('phone:clock:get', {}, MOCK_GET);
  dispatch(hydrateClock(res || {}));
};

export const addAlarm = (hour, min, label = '') => async (dispatch) => {
  const alarm = await fetchNui(
    'phone:clock:addAlarm',
    { hour, min, label },
    { id: Date.now(), hour, min, label, enabled: true }
  );
  if (alarm) dispatch(upsertAlarm(alarm));
  return alarm;
};

export const toggleAlarm = (id) => async (dispatch, getState) => {
  const a = getState().clock.alarms.find((x) => x.id === id);
  const next = a ? !a.enabled : true;
  dispatch(setAlarmEnabled({ id, enabled: next })); // optimistic
  const res = await fetchNui('phone:clock:toggleAlarm', { id }, next);
  if (typeof res === 'boolean') dispatch(setAlarmEnabled({ id, enabled: res }));
};

export const deleteAlarm = (id) => async (dispatch) => {
  dispatch(removeAlarm(id)); // optimistic
  await fetchNui('phone:clock:deleteAlarm', { id }, true);
};

export const startTimer = (total, { label = '', fromRecent = false } = {}) => async (dispatch) => {
  if (!total || total <= 0) return;
  // Optimistic client-anchored timer (server rearms + persists in the background).
  dispatch(
    setTimerLocal({
      total,
      label,
      fromRecent,
      paused: false,
      remaining: total,
      deadline: Date.now() + total * 1000,
    })
  );
  await fetchNui('phone:clock:startTimer', { total, label, fromRecent }, null);
};

export const pauseTimer = () => async (dispatch, getState) => {
  const tm = getState().clock.timer;
  if (!tm || tm.paused) return;
  const remaining = Math.max(0, Math.round((tm.deadline - Date.now()) / 1000));
  dispatch(setTimerLocal({ ...tm, paused: true, remaining, deadline: null }));
  await fetchNui('phone:clock:pauseTimer', {}, null);
};

export const resumeTimer = () => async (dispatch, getState) => {
  const tm = getState().clock.timer;
  if (!tm || !tm.paused) return;
  dispatch(
    setTimerLocal({ ...tm, paused: false, deadline: Date.now() + Math.max(1, tm.remaining) * 1000 })
  );
  await fetchNui('phone:clock:resumeTimer', {}, null);
};

export const cancelTimer = () => async (dispatch) => {
  dispatch(setTimerLocal(null)); // optimistic
  await fetchNui('phone:clock:cancelTimer', {}, true);
};

// Start a timer FROM a recent — the server won't re-log it to recents.
export const startRecent = (r) => (dispatch) => {
  const total = (r.h || 0) * 3600 + (r.m || 0) * 60 + (r.s || 0);
  return dispatch(startTimer(total, { fromRecent: true }));
};

export const deleteRecent = (index) => async (dispatch, getState) => {
  const recents = getState().clock.recents.slice();
  recents.splice(index, 1);
  dispatch(setRecents(recents)); // optimistic
  await fetchNui('phone:clock:deleteRecent', { index: index + 1 }, true); // 1-based on server
};

export const stopRing = () => async (dispatch) => {
  dispatch(setRinging(null)); // optimistic
  await fetchNui('phone:clock:stopRing', {}, true);
};

// ---- live server events ----
export const onTimerDone = (data) => (dispatch) => {
  dispatch(setTimerLocal(null));
  if (data && data.recents) dispatch(setRecents(data.recents));
};

export const onRing = (data) => (dispatch) => {
  if (!data) return;
  const meta = data.meta || {};
  dispatch(setRinging({ kind: data.kind, ...meta }));
};

// ---- alarm sounds (settings) ----
export const setAlarmTone = (url) => async (dispatch) => {
  dispatch(setAlarmRingtone(url || ''));
  await fetchNui('phone:clock:setAlarmTone', { url: url || '' }, true);
};

export const addAlarmTone = (name, url) => async (dispatch) => {
  const item = await fetchNui(
    'phone:clock:addAlarmTone',
    { name, url },
    { id: 'a' + Date.now(), name, url }
  );
  if (item) dispatch(addAlarmToneLocal(item));
  return item;
};

export const deleteAlarmTone = (id) => async (dispatch) => {
  dispatch(removeAlarmToneLocal(id));
  await fetchNui('phone:clock:deleteAlarmTone', { id }, true);
};

export default clockSlice.reducer;
