import { createSlice } from '@reduxjs/toolkit';

// Browser-dev default so the home screen isn't empty via `npm run dev`. In game
// this is replaced by Config.Apps (delivered on open).
const DEFAULT_LAYOUT = [
  { id: 'call', label: 'Phone', place: 'dock', enabled: true },
  { id: 'message', label: 'Messages', place: 'dock', enabled: true },
  { id: 'camera', label: 'Camera', place: 'dock', enabled: true },
  { id: 'photos', label: 'Photos', place: 'dock', enabled: true },
  { id: 'maps', label: 'Maps', place: 'grid', enabled: true },
  { id: 'clock', label: 'Clock', place: 'grid', enabled: true },
  { id: 'settings', label: 'Settings', place: 'grid', enabled: true },
  { id: 'calculator', label: 'Calculator', place: 'grid', enabled: true },
  { id: 'appstore', label: 'App Store', place: 'grid', enabled: true },
];

const initialState = {
  // Built-in apps, from Config.Apps (id, label, place, enabled).
  layout: DEFAULT_LAYOUT,
  // Third-party apps registered at runtime via exports.RegisterApp
  // ({ id, label, icon(url), url(iframe), place }).
  external: [],
};

const appsSlice = createSlice({
  name: 'apps',
  initialState,
  reducers: {
    setLayout(state, action) {
      if (Array.isArray(action.payload) && action.payload.length) state.layout = action.payload;
    },
    setExternalApps(state, action) {
      state.external = Array.isArray(action.payload) ? action.payload : [];
    },
  },
});

export const { setLayout, setExternalApps } = appsSlice.actions;

// Look up a registered third-party app by id (used to render its iframe).
export const selectExternalApp = (id) => (state) => state.apps.external.find((a) => a.id === id) || null;

export default appsSlice.reducer;
