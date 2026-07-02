import { createSlice } from '@reduxjs/toolkit';

// A single, phone-wide iOS-style alert dialog. Open it with the openDialog thunk,
// which returns a Promise that resolves with the tapped button's `value`.
const initialState = {
  open: false,
  title: '',
  message: '',
  buttons: [], // [{ text, style: 'default'|'cancel'|'destructive', value }]
};

const dialogSlice = createSlice({
  name: 'dialog',
  initialState,
  reducers: {
    showDialog(state, action) {
      const { title, message, buttons } = action.payload || {};
      state.open = true;
      state.title = title || '';
      state.message = message || '';
      state.buttons = buttons && buttons.length ? buttons : [{ text: 'OK', style: 'default', value: true }];
    },
    hideDialog(state) {
      state.open = false;
    },
  },
});

export const { showDialog, hideDialog } = dialogSlice.actions;

// The pending resolver for the currently-open dialog.
let resolver = null;

// Show a dialog and await the tapped button's value.
export const openDialog = (opts) => (dispatch) =>
  new Promise((resolve) => {
    resolver = resolve;
    dispatch(showDialog(opts));
  });

export const resolveDialog = (value) => (dispatch) => {
  dispatch(hideDialog());
  const r = resolver;
  resolver = null;
  if (r) r(value);
};

export default dialogSlice.reducer;
