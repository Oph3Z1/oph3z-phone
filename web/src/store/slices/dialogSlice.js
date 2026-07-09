import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    open: false,
    title: '',
    message: '',
    buttons: [],
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
            state.buttons =
                buttons && buttons.length
                    ? buttons
                    : [{ text: 'OK', style: 'default', value: true }];
        },
        hideDialog(state) {
            state.open = false;
        },
    },
});

export const { showDialog, hideDialog } = dialogSlice.actions;

let resolver = null;

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