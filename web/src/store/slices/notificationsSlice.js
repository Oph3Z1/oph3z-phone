import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { openApp, unlock, setLaunchTab } from './phoneSlice';
import { setResumeThread } from './messagesSlice';
import { setResumeGroup } from './groupsSlice';
import { setFocusMail } from './mailSlice';

const now = Math.floor(Date.now() / 1000);
const MOCK = [
  { id: 3, app: 'message', title: 'Eleanor Pena', body: "Can you bring a big salad? I'm on dessert duty.", ts: now - 20, read: false, route: { app: 'message', number: '5550199' } },
  { id: 2, app: 'message', title: 'Ralph Edwards', body: "Haha that's terrifying 😄", ts: now - 130, read: false, route: { app: 'message', number: '5550177' } },
  { id: 1, app: 'call', title: 'Cody Fisher', body: 'Missed Call', ts: now - 200, read: false, route: { app: 'call', tab: 'recents' } },
];

const initialState = {
  loaded: false,
  items: [], // newest first: { id, app, title, body, icon?, route?, ts, read }
  centerOpen: false, // pull-down Notification Center (unlocked)
  banner: null, // transient in-phone banner (phone open & unlocked)
  peek: null, // closed-phone peek notification
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    hydrateNotifs(state, action) {
      state.items = action.payload || [];
      state.loaded = true;
    },
    addNotif(state, action) {
      const n = action.payload;
      if (!n) return;
      if (!state.items.some((x) => x.id === n.id)) state.items.unshift(n);
    },
    markReadLocal(state, action) {
      const { id, app, number, gid, all } = action.payload || {};
      state.items.forEach((n) => {
        if (
          all ||
          (id != null && n.id === id) ||
          (app && n.app === app) ||
          (number && n.route && n.route.number === number) ||
          (gid && n.route && n.route.gid === gid)
        ) {
          n.read = true;
        }
      });
    },
    removeNotifLocal(state, action) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    removeNotifsMatching(state, action) {
      const { number, gid, app } = action.payload || {};
      state.items = state.items.filter((n) => {
        if (number && n.route && n.route.number === number) return false;
        if (gid && n.route && n.route.gid === gid) return false;
        if (app && n.app === app) return false;
        return true;
      });
    },
    clearAllLocal(state) {
      state.items = [];
    },
    setCenterOpen(state, action) {
      state.centerOpen = action.payload;
    },
    setBanner(state, action) {
      state.banner = action.payload;
    },
    setPeek(state, action) {
      state.peek = action.payload;
    },
  },
});

export const {
  hydrateNotifs,
  addNotif,
  markReadLocal,
  removeNotifLocal,
  removeNotifsMatching,
  clearAllLocal,
  setCenterOpen,
  setBanner,
  setPeek,
} = notificationsSlice.actions;

// ---- Thunks ---------------------------------------------------------------
export const loadNotifications = () => async (dispatch) => {
  const items = await fetchNui('phone:notifications:get', {}, MOCK);
  dispatch(hydrateNotifs(items));
};

// Present a freshly-arrived notification: store it, then choose how to show it
// based on the phone's current state (closed -> peek, open+unlocked -> banner,
// locked -> it's already on the lock-screen list). Returns false if suppressed
// (e.g. you're already reading that conversation) so the caller skips the sound.
export const presentNotification = (item) => (dispatch, getState) => {
  const state = getState();
  const route = item.route || {};
  const activeKey = route.gid ? `g:${route.gid}` : route.number;
  const viewingThisChat =
    state.phone.visible &&
    !state.phone.locked &&
    state.phone.activeApp === 'message' &&
    route.app === 'message' &&
    activeKey &&
    state.messages.active === activeKey;

  if (viewingThisChat) {
    // Already in this chat — drop it entirely (a read conversation keeps no
    // notifications in the center), no banner, no sound.
    fetchNui('phone:notifications:clear', { id: item.id }, true);
    return false;
  }

  dispatch(addNotif(item));
  if (!state.phone.visible) dispatch(setPeek(item));
  else if (!state.phone.locked) dispatch(setBanner(item));
  return true;
};

export const markNotifRead = (payload) => async (dispatch) => {
  dispatch(markReadLocal(payload)); // optimistic
  await fetchNui('phone:notifications:read', payload, true);
};

// Remove a conversation's / app's notifications from the center entirely (used
// when a chat is opened: a read conversation should leave nothing behind).
export const clearNotifsFor = (filter) => async (dispatch) => {
  dispatch(removeNotifsMatching(filter)); // optimistic
  await fetchNui('phone:notifications:clear', filter, true);
};

export const clearNotification = (id) => async (dispatch) => {
  if (id != null) dispatch(removeNotifLocal(id));
  else dispatch(clearAllLocal());
  await fetchNui('phone:notifications:clear', id != null ? { id } : {}, true);
};

// Tap a notification: dismiss overlays, mark it read, then open its target.
export const openRoute = (route, notifId) => (dispatch) => {
  dispatch(setCenterOpen(false));
  dispatch(setBanner(null));
  dispatch(setPeek(null));
  if (notifId != null) dispatch(markNotifRead({ id: notifId }));
  if (!route) return;
  dispatch(unlock());
  if (route.app === 'message' && route.gid) {
    dispatch(setResumeGroup(route.gid));
    dispatch(openApp('message'));
  } else if (route.app === 'message' && route.number) {
    dispatch(setResumeThread(route.number));
    dispatch(openApp('message'));
  } else if (route.app === 'call') {
    dispatch(setLaunchTab(route.tab || 'recents'));
    dispatch(openApp('call'));
  } else if (route.app === 'mail') {
    if (route.id != null) dispatch(setFocusMail(route.id));
    dispatch(openApp('mail'));
  } else if (route.app) {
    dispatch(openApp(route.app));
  }
};

// Unread count for an app id (for home-screen badges).
export const selectUnreadCount = (appId) => (state) =>
  state.notifications.items.reduce((acc, n) => acc + (!n.read && n.app === appId ? 1 : 0), 0);

export default notificationsSlice.reducer;
