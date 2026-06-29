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
    markReadLocal(state, action) {
      const th = state.threads.find((t) => t.number === action.payload);
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
  },
});

export const {
  setThreads,
  setThread,
  setActive,
  markReadLocal,
  appendMessage,
  removeThreadsLocal,
  reconcileMessage,
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

export const sendRequest = (number, amount) => async (dispatch) =>
  dispatch(sendMessage(number, { type: 'request', body: String(amount), meta: { amount } }));

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
