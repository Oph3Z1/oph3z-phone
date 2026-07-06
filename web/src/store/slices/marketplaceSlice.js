import { createSlice } from '@reduxjs/toolkit';

// Marketplace composer state that must survive the Camera round-trip (opening the
// Camera unmounts the whole app). The in-progress New Post form lives here as
// `draft`; `capture` is a photo/video handed back by the Camera and appended to
// the draft's media; `reopenCompose` tells MarketApp to reopen the form on return.
const initialState = {
  draft: null,          // { mode:'new'|'edit', id?, category, title, desc, price, media:[], allowCalls, allowMsg }
  capture: null,        // { url, type } from the Camera, consumed by the composer
  reopenCompose: false, // set when leaving for the Camera so we come back to the form
};

const emptyDraft = () => ({
  mode: 'new',
  id: null,
  category: 'ads',
  title: '',
  desc: '',
  price: '',
  media: [],
  allowCalls: true,
  allowMsg: true,
});

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    startDraft(state, action) {
      state.draft = { ...emptyDraft(), ...(action.payload || {}) };
    },
    patchDraft(state, action) {
      if (state.draft) Object.assign(state.draft, action.payload || {});
    },
    addMedia(state, action) {
      if (!state.draft) return;
      const item = action.payload;
      if (item && state.draft.media.length < 10) state.draft.media.push(item);
    },
    removeMedia(state, action) {
      if (state.draft) state.draft.media.splice(action.payload, 1);
    },
    clearDraft(state) {
      state.draft = null;
      state.capture = null;
      state.reopenCompose = false;
    },
    setCapture(state, action) {
      state.capture = action.payload || null;
    },
    clearCapture(state) {
      state.capture = null;
    },
    setReopenCompose(state, action) {
      state.reopenCompose = !!action.payload;
    },
  },
});

export const {
  startDraft, patchDraft, addMedia, removeMedia, clearDraft,
  setCapture, clearCapture, setReopenCompose,
} = marketplaceSlice.actions;

export { emptyDraft };
export default marketplaceSlice.reducer;
