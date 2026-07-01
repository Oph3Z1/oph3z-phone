import { createSlice } from '@reduxjs/toolkit';

// UI / runtime state of the phone (not persisted).
const initialState = {
  visible: false,      // is the phone shown on screen
  locked: true,        // lock screen vs home screen
  activeApp: null,     // id of the open app, or null for the home screen
  flashlightOn: false, // in-game flashlight beam toggle
  launchTab: null,     // a tab the next-opened app should jump to (e.g. Phone -> Recents)
  identity: { number: '', numberRaw: '', citizenid: '' }, // shared with third-party app iframes
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
      }
    },
    setFlashlight(state, action) {
      state.flashlightOn = action.payload;
    },
    lock(state) {
      state.locked = true;
      state.activeApp = null;
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

export const { setVisible, lock, unlock, openApp, closeApp, setTime, setFlashlight, setLaunchTab, setIdentity } =
  phoneSlice.actions;
export default phoneSlice.reducer;
