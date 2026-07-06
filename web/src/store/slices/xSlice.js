import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock: pretend we're logged in so `npm run dev` shows the feed.
const MOCK_ME = { id: 1, handle: 'you', name: 'You', avatar: null, verified: false };

const initialState = {
  loaded: false,   // session has been checked at least once
  me: null,        // logged-in account summary { id, handle, name, avatar, verified } | null
  mailAddress: null, // this character's Mail address (to pre-fill registration)
  // An in-progress email verification, kept here (not in a component) so the code
  // screen survives switching to the Mail app. { mode:'register'|'recover'|'email', email } | null
  pendingAuth: null,
  liveTick: 0,     // bumped on live server events to trigger a refresh
  capture: null,   // media captured via the Camera app, waiting for the composer { url, type }
  // Set before opening the Camera from the composer so X re-opens the composer
  // (and consumes `capture`) when it comes back. { replyTo } | null.
  pendingCompose: null,
  // Set before opening the Camera from Edit Profile so X re-opens the editor and
  // feeds the capture into the cropper. { field: 'avatar' | 'banner' } | null.
  pendingEdit: null,
};

const xSlice = createSlice({
  name: 'x',
  initialState,
  reducers: {
    setSession(state, action) {
      const p = action.payload || {};
      state.me = p.me || null;
      if (p.mailAddress !== undefined) state.mailAddress = p.mailAddress || null;
      state.loaded = true;
    },
    setMe(state, action) {
      state.me = action.payload || null;
    },
    setPendingAuth(state, action) {
      state.pendingAuth = action.payload || null;
    },
    clearPendingAuth(state) {
      state.pendingAuth = null;
    },
    bumpLive(state) {
      state.liveTick += 1;
    },
    setCapture(state, action) {
      state.capture = action.payload || null;
    },
    clearCapture(state) {
      state.capture = null;
    },
    setPendingCompose(state, action) {
      state.pendingCompose = action.payload || null;
    },
    clearPendingCompose(state) {
      state.pendingCompose = null;
    },
    setPendingEdit(state, action) {
      state.pendingEdit = action.payload || null;
    },
    clearPendingEdit(state) {
      state.pendingEdit = null;
    },
  },
});

export const {
  setSession, setMe, setPendingAuth, clearPendingAuth, bumpLive, setCapture, clearCapture,
  setPendingCompose, clearPendingCompose, setPendingEdit, clearPendingEdit,
} = xSlice.actions;

// ---- thunks ----
export const loadSession = () => async (dispatch) => {
  const res = await fetchNui('phone:x:session', {}, { me: MOCK_ME, mailAddress: 'you@mail.com' });
  dispatch(setSession(res || {}));
};

export const doLogout = () => async (dispatch) => {
  await fetchNui('phone:x:logout', {}, { ok: true });
  dispatch(setMe(null));
};

export default xSlice.reducer;
