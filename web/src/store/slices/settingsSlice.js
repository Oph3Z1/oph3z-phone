import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Persisted phone settings (mirrors the server-side JSON document).
const initialState = {
  loaded: false,
  wallpaper: 'default',
  brightness: 100, // 20-100 (Control Center)
  volume: 70,      // 0-100 media volume
  airdrop: false,  // AirDrop receiving toggle
  airplane: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    hydrate(state, action) {
      // Replace local settings with whatever the server loaded for this citizen.
      return { ...state, ...(action.payload || {}), loaded: true };
    },
    applySetting(state, action) {
      const { key, value } = action.payload;
      state[key] = value;
    },
  },
});

export const { hydrate, applySetting } = settingsSlice.actions;

// Thunk: update a setting locally AND persist it to the JSON DB via Lua.
export const saveSetting = (key, value) => (dispatch) => {
  dispatch(applySetting({ key, value }));
  fetchNui('phone:saveSettings', { [key]: value }, { ok: true });
};

// Thunk for continuous controls (sliders): apply live for a smooth UI, but only
// persist to the server a short while after the last change — otherwise dragging
// floods the NUI->server callback (which then times out). Pending values are also
// flushed on demand (e.g. when the Control Center closes) via flushSettings().
const persistTimers = {};
const pendingSettings = {};
export const saveSettingLive = (key, value, delay = 350) => (dispatch) => {
  dispatch(applySetting({ key, value }));
  pendingSettings[key] = value;
  clearTimeout(persistTimers[key]);
  persistTimers[key] = setTimeout(() => {
    fetchNui('phone:saveSettings', { [key]: value }, { ok: true });
    delete persistTimers[key];
    delete pendingSettings[key];
  }, delay);
};

// Immediately persist any not-yet-saved live settings (batched into one save).
export const flushSettings = () => () => {
  const keys = Object.keys(pendingSettings);
  if (keys.length === 0) return;
  const patch = {};
  for (const key of keys) {
    patch[key] = pendingSettings[key];
    clearTimeout(persistTimers[key]);
    delete persistTimers[key];
    delete pendingSettings[key];
  }
  fetchNui('phone:saveSettings', patch, { ok: true });
};

// Thunk: toggle airplane mode (for the future Settings switch).
export const setAirplane = (value) => (dispatch) => {
  dispatch(applySetting({ key: 'airplane', value }));
  fetchNui('phone:phone:setAirplane', { value }, value);
};

export default settingsSlice.reducer;
