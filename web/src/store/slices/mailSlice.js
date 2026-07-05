import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock so the app isn't empty via `npm run dev`.
const MOCK = {
  address: 'jane.doe@mail.com',
  inbox: [
    { id: 5, from: 'noreply@lsbank.com', fromName: 'LS Bank', subject: 'Statement ready', body: 'Your monthly statement is now available. Balance: $12,430.', system: true, read: false, ts: Math.floor(Date.now() / 1000) - 1800 },
    { id: 4, from: 'mike.reyes@mail.com', fromName: 'Mike Reyes', subject: 'Tonight?', body: 'You free tonight? Thinking about the docks meetup. Bring the photos.', read: false, ts: Math.floor(Date.now() / 1000) - 9000 },
    { id: 2, from: 'careers@weazelnews.com', fromName: 'Weazel News', subject: 'Application received', body: 'Thanks for applying. We will be in touch.', system: true, read: true, ts: Math.floor(Date.now() / 1000) - 200000 },
  ],
  sent: [
    { id: 3, to: 'mike.reyes@mail.com', toName: 'Mike Reyes', subject: 'Re: Tonight?', body: 'Yeah, count me in. 9pm.', ts: Math.floor(Date.now() / 1000) - 8000 },
  ],
};

const initialState = {
  loaded: false,
  address: '',
  inbox: [],
  sent: [],
  focusId: null, // an inbox mail id to open (from a notification)
};

const mailSlice = createSlice({
  name: 'mail',
  initialState,
  reducers: {
    hydrateMail(state, action) {
      const p = action.payload || {};
      state.address = p.address || '';
      state.inbox = p.inbox || [];
      state.sent = p.sent || [];
      state.loaded = true;
    },
    addInboxLocal(state, action) {
      if (action.payload) state.inbox.unshift(action.payload);
    },
    addSentLocal(state, action) {
      if (action.payload) state.sent.unshift(action.payload);
    },
    markReadLocal(state, action) {
      const m = state.inbox.find((x) => x.id === action.payload);
      if (m) m.read = true;
    },
    removeMailLocal(state, action) {
      const { folder, id } = action.payload;
      state[folder] = state[folder].filter((x) => x.id !== id);
    },
    setFocusMail(state, action) {
      state.focusId = action.payload || null;
    },
  },
});

export const {
  hydrateMail,
  addInboxLocal,
  addSentLocal,
  markReadLocal,
  removeMailLocal,
  setFocusMail,
} = mailSlice.actions;

// ---- Thunks ---------------------------------------------------------------
export const loadMail = () => async (dispatch) => {
  const res = await fetchNui('phone:mail:get', {}, MOCK);
  dispatch(hydrateMail(res || {}));
};

export const sendMail = (data) => async (dispatch) => {
  const res = await fetchNui('phone:mail:send', data, { ok: true, sent: { id: 'tmp' + Date.now(), ...data, ts: Math.floor(Date.now() / 1000) } });
  if (res && res.ok && res.sent) dispatch(addSentLocal(res.sent));
  return res || { ok: false };
};

export const readMail = (id) => async (dispatch) => {
  dispatch(markReadLocal(id)); // optimistic
  await fetchNui('phone:mail:read', { id }, true);
};

export const deleteMail = (folder, id) => async (dispatch) => {
  dispatch(removeMailLocal({ folder, id })); // optimistic
  await fetchNui('phone:mail:delete', { folder, id }, true);
};

// Live incoming mail (server push).
export const receiveMail = (item) => (dispatch) => {
  if (item) dispatch(addInboxLocal(item));
};

export default mailSlice.reducer;
