import { createSlice } from '@reduxjs/toolkit';
import { getApp } from '../../app/registry';

// Transient "status toast" — a lightweight success/error/info message that pops
// at the top for a few seconds and is NEVER stored. This is deliberately its own
// system, separate from the saved notification banner/center (notificationsSlice):
// those persist and are tappable; a toast is throwaway feedback ("Photo saved",
// "Couldn't save"). Only one shows at a time — while one is up, new ones are
// dropped (a status message shouldn't stack).

const initialState = {
  toast: null, // { id, type, title, body, icon, app } | null
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast(state, action) {
      if (state.toast) return; // one at a time — block while one is showing
      state.toast = action.payload;
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const { showToast, clearToast } = toastSlice.actions;

// Present a status toast. Resolves the icon from the target app (the one passed,
// else the app currently open) so it matches the app the message is about, exactly
// like the notification card. Blocked if a toast is already on screen.
export const pushToast = (payload) => (dispatch, getState) => {
  if (!payload) return;
  const state = getState();
  // A status toast is on-screen feedback: only show it if the phone is actually
  // open right now. Fired while the phone is closed -> dropped entirely (it must
  // never resurface later just because time was left on it).
  if (!state.phone.visible) return;
  if (state.toast.toast) return; // already showing — drop this one

  const appId = payload.app || state.phone.activeApp || null;
  let icon = payload.icon;
  if (!icon && appId) {
    const built = getApp(appId); // built-in app icon
    if (built) icon = built.icon;
    else {
      const ext = state.apps.external.find((a) => a.id === appId); // third-party app icon
      if (ext) icon = ext.icon;
    }
  }

  dispatch(
    showToast({
      id: Date.now(),
      type: payload.type || 'info', // 'success' | 'error' | 'info' (semantic; UI is identical)
      title: payload.title || '',
      body: payload.body || '',
      icon: icon || null,
      app: appId,
    })
  );
};

export default toastSlice.reducer;
