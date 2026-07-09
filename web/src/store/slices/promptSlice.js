import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    open: false,
    title: '',
    message: '',
    placeholder: '',
    value: '',
    confirmText: 'Done',
    cancelText: 'Cancel',
    maxLength: 60,
    fields: null,
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

let resolver = null;

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