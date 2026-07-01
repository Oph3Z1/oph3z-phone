import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { digitsOf } from './contactsSlice';
import { loadThreads, markReadLocal } from './messagesSlice';

// Browser-dev mock so a group opens with content via `npm run dev`.
const now = Math.floor(Date.now() / 1000);
const MOCK_GROUP = {
  gid: 'gmock',
  name: 'Heist Crew',
  photo: '',
  owner: '5550142',
  isOwner: true,
  selfNumber: '5550142',
  members: [
    { number: '5550142', name: 'Me', avatar: '', isOwner: true, lastReadId: 'm3' },
    { number: '5550199', name: 'Pappa', avatar: '', isOwner: false, lastReadId: 'm3' },
    { number: '5550177', name: 'Amirali', avatar: '', isOwner: false, lastReadId: 'm2' },
  ],
  items: [
    { id: 'm1', from: '', type: 'system', body: 'Group created', ts: now - 600 },
    { id: 'm2', from: '5550199', mine: false, senderName: 'Pappa', type: 'text', body: 'Everyone ready?', ts: now - 300, reactions: {} },
    { id: 'm3', from: '5550142', mine: true, type: 'text', body: 'On my way', ts: now - 120, reactions: { 5550177: '❤️' } },
  ],
};

const initialState = {
  byGid: {}, // { [gid]: detail }
  active: null, // gid currently open
  resumeGroup: null, // gid MessagesApp should open on mount (from a notification)
  draftAttach: {}, // { [gid]: { type, url } } pending media in the composer
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroup(state, action) {
      const g = action.payload;
      if (g && g.gid) state.byGid[g.gid] = g;
    },
    setActiveGroup(state, action) {
      state.active = action.payload;
    },
    setResumeGroup(state, action) {
      state.resumeGroup = action.payload;
    },
    setGroupDraft(state, action) {
      const { gid, attach } = action.payload;
      if (attach) state.draftAttach[gid] = attach;
      else delete state.draftAttach[gid];
    },
    appendGroupMessage(state, action) {
      const { gid, msg } = action.payload;
      const g = state.byGid[gid];
      if (g && !g.items.some((m) => m.id === msg.id)) g.items.push(msg);
    },
    reconcileGroupMessage(state, action) {
      const { gid, tempId, msg } = action.payload;
      const g = state.byGid[gid];
      if (!g) return;
      const i = g.items.findIndex((m) => m.id === tempId);
      if (i >= 0) g.items[i] = msg;
    },
    setReactionLocal(state, action) {
      const { gid, id, number, emoji } = action.payload;
      const g = state.byGid[gid];
      if (!g) return;
      const m = g.items.find((x) => x.id === id);
      if (!m) return;
      m.reactions = m.reactions || {};
      if (emoji) m.reactions[number] = emoji;
      else delete m.reactions[number];
    },
    setReadLocal(state, action) {
      const { gid, number, lastReadId } = action.payload;
      const g = state.byGid[gid];
      if (!g) return;
      const mem = g.members.find((x) => x.number === number);
      if (mem) mem.lastReadId = lastReadId;
    },
    updateGroupLocation(state, action) {
      const { gid, id, x, y, label, live, endReason } = action.payload;
      const g = state.byGid[gid];
      if (!g) return;
      const m = g.items.find((it) => it.id === id);
      if (!m) return;
      m.meta = m.meta || {};
      if (typeof x === 'number') m.meta.x = x;
      if (typeof y === 'number') m.meta.y = y;
      if (label != null) m.meta.label = label;
      if (typeof live === 'boolean') m.meta.live = live;
      if (endReason != null) m.meta.endReason = endReason;
    },
    removeGroup(state, action) {
      const gid = action.payload;
      delete state.byGid[gid];
      if (state.active === gid) state.active = null;
    },
  },
});

export const {
  setGroup,
  setActiveGroup,
  setResumeGroup,
  setGroupDraft,
  appendGroupMessage,
  reconcileGroupMessage,
  setReactionLocal,
  setReadLocal,
  updateGroupLocation,
  removeGroup,
} = groupsSlice.actions;

// ---- Thunks ---------------------------------------------------------------
export const openGroup = (gid) => async (dispatch) => {
  const g = await fetchNui('phone:groups:open', { gid }, MOCK_GROUP);
  if (g && g.gid) {
    dispatch(setGroup(g));
    dispatch(markReadLocal(`g:${gid}`)); // clear the thread-row unread dot
  }
  return g;
};

export const createGroup = (payload) => async (dispatch) => {
  const res = await fetchNui('phone:groups:create', payload, { gid: 'gmock' });
  if (res && res.gid) dispatch(loadThreads());
  return res && res.gid ? res.gid : null;
};

export const sendGroupMessage = (gid, payload) => async (dispatch, getState) => {
  const tempId = 'tmp' + Date.now();
  const temp = {
    id: tempId,
    from: digitsOf(getState().contacts.number),
    mine: true,
    type: payload.type || 'text',
    body: payload.body || '',
    meta: payload.meta,
    ts: Math.floor(Date.now() / 1000),
    reactions: {},
    pending: true,
  };
  dispatch(appendGroupMessage({ gid, msg: temp }));

  const created = await fetchNui(
    'phone:groups:send',
    { gid, type: temp.type, body: temp.body, meta: temp.meta },
    { ...temp, id: 'srv' + Date.now(), pending: false }
  );
  if (created) dispatch(reconcileGroupMessage({ gid, tempId, msg: created }));
  return created;
};

export const reactGroup = (gid, id, emoji) => async (dispatch, getState) => {
  const self = getState().groups.byGid[gid]?.selfNumber || digitsOf(getState().contacts.number);
  const cur = getState().groups.byGid[gid]?.items.find((m) => m.id === id)?.reactions?.[self];
  const next = cur === emoji ? '' : emoji; // tapping the same one clears it
  dispatch(setReactionLocal({ gid, id, number: self, emoji: next }));
  await fetchNui('phone:groups:react', { gid, id, emoji }, true);
};

export const manageGroup = (gid, action, extra = {}) => async (dispatch) => {
  const res = await fetchNui('phone:groups:manage', { gid, action, ...extra }, { ok: true });
  if (res && res.ok) {
    if (res.left || res.deleted) {
      dispatch(removeGroup(gid));
      dispatch(loadThreads());
    } else if (res.group) {
      dispatch(setGroup(res.group));
      dispatch(loadThreads());
    }
  }
  return res;
};

export const sendGroupLocation = (gid, opts = {}) => async (dispatch) => {
  const msg = await fetchNui(
    'phone:groups:location',
    { gid, live: !!opts.live, duration: opts.duration || 0 },
    {
      id: 'srv' + Date.now(),
      from: 'me',
      mine: true,
      type: 'location',
      body: 'Location',
      meta: { x: 0, y: 0, label: 'Current Location', live: !!opts.live },
      ts: Math.floor(Date.now() / 1000),
    }
  );
  if (msg) dispatch(appendGroupMessage({ gid, msg }));
  return msg;
};

export const stopGroupLive = (gid, sid, id) => async (dispatch) => {
  const res = await fetchNui('phone:groups:locstop', { sid }, { ok: true });
  if (res && res.ok) dispatch(updateGroupLocation({ gid, id, live: false, endReason: 'stopped' }));
  return res;
};

// Live incoming group message. Append it; if we're viewing the group, mark read.
export const receiveGroupIncoming = (payload) => (dispatch, getState) => {
  if (!payload || !payload.msg) return;
  const { gid, msg, senderName } = payload;
  dispatch(appendGroupMessage({ gid, msg: { ...msg, mine: false, senderName } }));
  if (getState().groups.active === gid) {
    fetchNui('phone:groups:read', { gid }, true);
  }
};

export default groupsSlice.reducer;
