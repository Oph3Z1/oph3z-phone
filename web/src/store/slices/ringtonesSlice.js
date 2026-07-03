import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock so the Ringtones screen isn't empty via `npm run dev`.
const MOCK = {
  ringtones: [
    { id: 'default', name: 'Default', url: '', builtin: true },
    { id: 'apex', name: 'Apex', url: '', builtin: true },
    { id: 'chime', name: 'Chime', url: '', builtin: true },
  ],
  selected: '',
};

const initialState = {
  loaded: false,
  items: [], // [{ id, name, url, builtin }]
};

const ringtonesSlice = createSlice({
  name: 'ringtones',
  initialState,
  reducers: {
    hydrateRingtones(state, action) {
      state.items = action.payload || [];
      state.loaded = true;
    },
    addRingtoneLocal(state, action) {
      if (action.payload) state.items.push(action.payload);
    },
    removeRingtoneLocal(state, action) {
      state.items = state.items.filter((r) => r.id !== action.payload);
    },
  },
});

export const { hydrateRingtones, addRingtoneLocal, removeRingtoneLocal } = ringtonesSlice.actions;

// ---- Thunks ---------------------------------------------------------------
export const loadRingtones = () => async (dispatch) => {
  const res = await fetchNui('phone:ringtones:get', {}, MOCK);
  dispatch(hydrateRingtones((res && res.ringtones) || []));
};

export const addRingtone = (name, url) => async (dispatch) => {
  const item = await fetchNui(
    'phone:ringtones:add',
    { name, url },
    { id: 'c' + Date.now(), name, url, builtin: false }
  );
  if (item) dispatch(addRingtoneLocal(item));
  return item;
};

export const deleteRingtone = (id) => async (dispatch) => {
  dispatch(removeRingtoneLocal(id)); // optimistic
  await fetchNui('phone:ringtones:delete', { id }, true);
};

export default ringtonesSlice.reducer;
