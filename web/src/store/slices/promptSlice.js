import { createSlice } from '@reduxjs/toolkit';

// A single, phone-wide iOS-style text-input popup.
// Open it with the openPrompt thunk, which returns a Promise resolving with:
//   - single field  -> the entered string (or null on cancel)
//   - multiple fields -> an object { [key]: value } (or null on cancel)
// Pass `fields: [{ key, placeholder?, label?, value?, maxLength?, optional? }]` for
// a multi-input popup (e.g. "Add New Ringtone" = Name + URL). Reusable by any app —
// and by third-party iframe apps via the postMessage bridge (see ExternalApp).
const initialState = {
  open: false,
  title: '',
  message: '',
  placeholder: '',
  value: '',          // seed / current field value (single-field mode)
  confirmText: 'Done',
  cancelText: 'Cancel',
  maxLength: 60,
  fields: null,       // null = single-field; array = multi-field
};

const promptSlice = createSlice({
  name: 'prompt',
  initialState,
  reducers: {
    showPrompt(state, action) {
      const o = action.payload || {};
      state.open = true;
      state.title = o.title || '';
      state.message = o.message || '';
      state.placeholder = o.placeholder || '';
      state.value = o.value || '';
      state.confirmText = o.confirmText || 'Done';
      state.cancelText = o.cancelText || 'Cancel';
      state.maxLength = o.maxLength || 60;
      state.fields = Array.isArray(o.fields) && o.fields.length ? o.fields : null;
    },
    hidePrompt(state) {
      state.open = false;
    },
  },
});

export const { showPrompt, hidePrompt } = promptSlice.actions;

// The pending resolver for the currently-open prompt.
let resolver = null;

// Show the prompt and await the entered value (string) or null (cancelled).
export const openPrompt = (opts) => (dispatch) =>
  new Promise((resolve) => {
    resolver = resolve;
    dispatch(showPrompt(opts));
  });

export const resolvePrompt = (value) => (dispatch) => {
  dispatch(hidePrompt());
  const r = resolver;
  resolver = null;
  if (r) r(value);
};

export default promptSlice.reducer;
