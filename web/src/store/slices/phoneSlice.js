import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// UI / runtime state of the phone (not persisted).
const initialState = {
  visible: false,      // is the phone shown on screen
  locked: true,        // lock screen vs home screen
  activeApp: null,     // id of the open app, or null for the home screen
  flashlightOn: false, // in-game flashlight beam toggle
  controlCenterOpen: false, // Control Center overlay
  launchTab: null,     // a tab the next-opened app should jump to (e.g. Phone -> Recents)
  identity: { number: '', numberRaw: '', citizenid: '', name: '', email: '', avatar: '' }, // shared with third-party app iframes
  // Live clock / weather pushed from the game.
  time: {
    useGameTime: true,
    hours: 11,
    minutes: 34,
    day: 7,
    month: 6,
    weekday: 3,
    year: 2025,
    weather: 0,
    temperature: 70,
    tempUnit: 'F',
  },
};

const phoneSlice = createSlice({
  name: 'phone',
  initialState,
  reducers: {
    setVisible(state, action) {
      state.visible = action.payload;
      if (!action.payload) {
        // Reset navigation when the phone closes so it reopens on the lock screen.
        state.locked = true;
        state.activeApp = null;
        state.flashlightOn = false; // closing the phone disables the flashlight
        state.controlCenterOpen = false;
      }
    },
    setFlashlight(state, action) {
      state.flashlightOn = action.payload;
    },
    setControlCenter(state, action) {
      state.controlCenterOpen = !!action.payload;
    },
    toggleControlCenter(state) {
      state.controlCenterOpen = !state.controlCenterOpen;
    },
    lock(state) {
      state.locked = true;
      state.activeApp = null;
      state.controlCenterOpen = false;
    },
    unlock(state) {
      state.locked = false;
    },
    openApp(state, action) {
      state.activeApp = action.payload;
    },
    closeApp(state) {
      state.activeApp = null;
    },
    setLaunchTab(state, action) {
      state.launchTab = action.payload;
    },
    setIdentity(state, action) {
      state.identity = { ...state.identity, ...(action.payload || {}) };
    },
    setTime(state, action) {
      state.time = { ...state.time, ...action.payload };
    },
  },
});

export const {
  setVisible,
  lock,
  unlock,
  openApp,
  closeApp,
  setTime,
  setFlashlight,
  setControlCenter,
  toggleControlCenter,
  setLaunchTab,
  setIdentity,
} = phoneSlice.actions;

// ---- Profile thunks (rename ID / set avatar) ------------------------------
// Optimistically update the shared identity, then persist to the JSON DB. The
// updated identity flows to the Settings card, Profile screen and app iframes.
export const saveProfileName = (name) => async (dispatch) => {
  const clean = (name || '').trim();
  if (!clean) return;
  dispatch(setIdentity({ name: clean }));
  await fetchNui('phone:profile:setName', { name: clean }, clean);
};

export const saveAvatar = (url) => async (dispatch) => {
  const clean = (url || '').trim();
  dispatch(setIdentity({ avatar: clean }));
  await fetchNui('phone:profile:setAvatar', { url: clean }, clean);
};

export default phoneSlice.reducer;
