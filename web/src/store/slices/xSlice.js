import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

const MOCK_ME = { id: 1, handle: 'you', name: 'You', avatar: null, verified: false };

const initialState = {
    loaded: false,
    me: null,
    mailAddress: null,
    pendingAuth: null,
    liveTick: 0,
    capture: null,
    pendingCompose: null,
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
    setSession,
    setMe,
    setPendingAuth,
    clearPendingAuth,
    bumpLive,
    setCapture,
    clearCapture,
    setPendingCompose,
    clearPendingCompose,
    setPendingEdit,
    clearPendingEdit,
} = xSlice.actions;

export const loadSession = () => async (dispatch) => {
    const res = await fetchNui('phone:x:session', {}, { me: MOCK_ME, mailAddress: 'you@mail.com' });
    dispatch(setSession(res || {}));
};

export const doLogout = () => async (dispatch) => {
    await fetchNui('phone:x:logout', {}, { ok: true });
    dispatch(setMe(null));
};

export default xSlice.reducer;