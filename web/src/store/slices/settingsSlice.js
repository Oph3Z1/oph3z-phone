import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Persisted phone settings (mirrors the server-side JSON document).
const initialState = {
  loaded: false,
  wallpaper: 'default',
  brightness: 100,
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

// Thunk: toggle airplane mode (for the future Settings switch).
export const setAirplane = (value) => (dispatch) => {
  dispatch(applySetting({ key: 'airplane', value }));
  fetchNui('phone:phone:setAirplane', { value }, value);
};

export default settingsSlice.reducer;
