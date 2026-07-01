import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock so the app isn't empty via `npm run dev`.
const now = Math.floor(Date.now() / 1000);
const MOCK_THREADS = [
  { number: '5550199', name: 'Pappa', avatar: '', lastType: 'text', lastBody: 'Call me when you can', lastDir: 'in', lastTs: now - 200, unread: 1 },
  { number: '5550177', name: 'Amirali', avatar: '', lastType: 'text', lastBody: 'On my way', lastDir: 'out', lastTs: now - 5000, unread: 0 },
];

const initialState = {
  loaded: false,
  threads: [], // [{ number, name, avatar, lastType, lastBody, lastDir, lastTs, unread }]
  byNumber: {}, // { [number]: { number, name, avatar, items: [...] } }
  active: null, // number of the thread currently being viewed
  shareTo: null, // number the Camera should attach its next capture to
  resumeThread: null, // number MessagesApp should reopen on mount (after a capture)
  returnProfile: null, // number whose conversation, when backed out of, returns to its Phone profile
  draftAttach: {}, // { [number]: { type, url } } pending media in the composer
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setThreads(state, action) {
      state.threads = action.payload || [];
      state.loaded = true;
    },
    setThread(state, action) {
      const t = action.payload;
      if (!t) return;
      state.byNumber[t.number] = {
        number: t.number,
        name: t.name,
        avatar: t.avatar,
        items: t.items || [],
      };
    },
    setActive(state, action) {
      state.active = action.payload;
    },
    setShareTo(state, action) {
      state.shareTo = action.payload;
    },
    setResumeThread(state, action) {
      state.resumeThread = action.payload;
    },
    setReturnProfile(state, action) {
      state.returnProfile = action.payload;
    },
    setDraftAttach(state, action) {
      const { number, attach } = action.payload;
      if (attach) state.draftAttach[number] = attach;
      else delete state.draftAttach[number];
    },
    markReadLocal(state, action) {
      // payload is a DM number, or a group key "g:<gid>".
      const key = action.payload;
      const th = state.threads.find((t) => (t.isGroup ? `g:${t.gid}` === key : t.number === key));
      if (th) th.unread = 0;
    },
    appendMessage(state, action) {
      const { number, name, avatar, msg } = action.payload;

      const conv = state.byNumber[number];
      if (conv && !conv.items.some((m) => m.id === msg.id)) conv.items.push(msg);

      // Update (and move to top) the thread row.
      const idx = state.threads.findIndex((t) => t.number === number);
      let th;
      if (idx >= 0) {
        th = state.threads[idx];
        state.threads.splice(idx, 1);
      } else {
        th = { number, name: name || number, avatar, unread: 0 };
      }
      th.lastType = msg.type;
      th.lastBody = msg.body;
      th.lastDir = msg.dir;
      th.lastTs = msg.ts;
      // Don't count it unread if we're currently viewing this thread.
      if (msg.dir === 'in' && number !== state.active) th.unread = (th.unread || 0) + 1;
      state.threads.unshift(th);
    },
    removeThreadsLocal(state, action) {
      const set = new Set(action.payload || []);
      state.threads = state.threads.filter((t) => !set.has(t.number));
      (action.payload || []).forEach((n) => delete state.byNumber[n]);
    },
    reconcileMessage(state, action) {
      const { number, tempId, msg } = action.payload;
      const conv = state.byNumber[number];
      if (conv) {
        const i = conv.items.findIndex((m) => m.id === tempId);
        if (i >= 0) conv.items[i] = msg;
      }
      const th = state.threads.find((t) => t.number === number);
      if (th && th.lastTs === msg.ts) th.lastBody = msg.body;
    },
    updateMessageStatus(state, action) {
      const { number, id, status } = action.payload;
      const conv = state.byNumber[number];
      if (!conv) return;
      const m = conv.items.find((x) => x.id === id);
      if (m) {
        m.meta = m.meta || {};
        m.meta.status = status;
      }
    },
    updateLocation(state, action) {
      const { number, id, x, y, label, live, endReason } = action.payload;
      const conv = state.byNumber[number];
      if (!conv) return;
      const m = conv.items.find((it) => it.id === id);
      if (!m) return;
      m.meta = m.meta || {};
      if (typeof x === 'number') m.meta.x = x;
      if (typeof y === 'number') m.meta.y = y;
      if (label != null) m.meta.label = label;
      if (typeof live === 'boolean') m.meta.live = live;
      if (endReason != null) m.meta.endReason = endReason;
    },
  },
});

export const {
  setThreads,
  setThread,
  setActive,
  setShareTo,
  setResumeThread,
  setReturnProfile,
  setDraftAttach,
  markReadLocal,
  appendMessage,
  removeThreadsLocal,
  reconcileMessage,
  updateMessageStatus,
  updateLocation,
} = messagesSlice.actions;

// ---- Thunks ---------------------------------------------------------------
export const loadThreads = () => async (dispatch) => {
  const t = await fetchNui('phone:messages:threads', {}, MOCK_THREADS);
  dispatch(setThreads(t));
};

export const openThread = (number) => async (dispatch) => {
  const t = await fetchNui('phone:messages:open', { number }, { number, name: number, avatar: '', items: [] });
  if (t) {
    dispatch(setThread(t));
    dispatch(markReadLocal(number));
  }
  return t;
};

export const sendMessage = (number, payload) => async (dispatch) => {
  const tempId = 'tmp' + Date.now();
  const temp = {
    id: tempId,
    dir: 'out',
    type: payload.type || 'text',
    body: payload.body || '',
    meta: payload.meta,
    ts: Math.floor(Date.now() / 1000),
    read: true,
    pending: true,
  };
  dispatch(appendMessage({ number, msg: temp }));

  const created = await fetchNui(
    'phone:messages:send',
    { to: number, type: temp.type, body: temp.body, meta: temp.meta },
    { ...temp, id: 'srv' + Date.now(), pending: false }
  );
  if (created) dispatch(reconcileMessage({ number, tempId, msg: created }));
  return created;
};

export const sendMoney = (number, amount) => async (dispatch) => {
  const res = await fetchNui(
    'phone:messages:money',
    { to: number, amount },
    { ok: true, msg: { id: 'srv' + Date.now(), dir: 'out', type: 'money', body: String(amount), meta: { amount }, ts: Math.floor(Date.now() / 1000), read: true } }
  );
  if (res && res.ok && res.msg) dispatch(appendMessage({ number, msg: res.msg }));
  return res;
};

export const sendRequest = (number, amount) => async (dispatch) => {
  const msg = await fetchNui(
    'phone:messages:request',
    { to: number, amount },
    { id: 'srv' + Date.now(), dir: 'out', type: 'request', body: String(amount), meta: { amount, status: 'pending', payer: number, payee: 'me' }, ts: Math.floor(Date.now() / 1000), read: true }
  );
  if (msg) dispatch(appendMessage({ number, msg }));
  return msg;
};

export const settleNegotiation = (number, id) => async (dispatch) => {
  const res = await fetchNui('phone:messages:negotiate', { action: 'settle', number, id }, { ok: true });
  if (res && res.ok) dispatch(updateMessageStatus({ number, id, status: 'paid' }));
  return res;
};

export const declineNegotiation = (number, id) => async (dispatch) => {
  const res = await fetchNui('phone:messages:negotiate', { action: 'decline', number, id }, { ok: true });
  if (res && res.ok) dispatch(updateMessageStatus({ number, id, status: 'declined' }));
  return res;
};

// Send a location. opts: { live, duration } — static if !live. The client
// resolves the current coords/label and the server delivers a 'location' message.
export const sendLocation = (number, opts = {}) => async (dispatch) => {
  const msg = await fetchNui(
    'phone:messages:location',
    { to: number, live: !!opts.live, duration: opts.duration || 0 },
    {
      id: 'srv' + Date.now(),
      dir: 'out',
      type: 'location',
      body: 'Location',
      meta: { x: 0, y: 0, label: 'Current Location', live: !!opts.live },
      ts: Math.floor(Date.now() / 1000),
      read: true,
    }
  );
  if (msg) dispatch(appendMessage({ number, msg }));
  return msg;
};

export const stopLive = (number, sid, id) => async (dispatch) => {
  const res = await fetchNui('phone:messages:locstop', { sid }, { ok: true });
  if (res && res.ok) dispatch(updateLocation({ number, id, live: false, endReason: 'stopped' }));
  return res;
};

export const deleteThreads = (numbers) => async (dispatch) => {
  dispatch(removeThreadsLocal(numbers)); // optimistic
  await fetchNui('phone:messages:delete', { numbers }, true);
};

export const receiveIncoming = (payload) => (dispatch, getState) => {
  if (!payload || !payload.msg) return;
  dispatch(
    appendMessage({
      number: payload.from,
      name: payload.name,
      avatar: payload.avatar,
      msg: payload.msg,
    })
  );
  // If we're viewing this thread, mark it read server-side too (so it doesn't
  // come back as unread when the phone reloads).
  if (getState().messages.active === payload.from) {
    fetchNui('phone:messages:read', { number: payload.from }, true);
  }
};

export default messagesSlice.reducer;
