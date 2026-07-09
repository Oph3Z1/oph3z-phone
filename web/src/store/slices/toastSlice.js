import { createSlice } from '@reduxjs/toolkit';
import { getApp } from '../../app/registry';

const initialState = {
    toast: null,
};

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        showToast(state, action) {
            if (state.toast) return;
            state.toast = action.payload;
        },
        clearToast(state) {
            state.toast = null;
        },
    },
});

export const { showToast, clearToast } = toastSlice.actions;

export const pushToast = (payload) => (dispatch, getState) => {
    if (!payload) return;
    const state = getState();
    if (!state.phone.visible) return;
    if (state.toast.toast) return;

    const appId = payload.app || state.phone.activeApp || null;
    let icon = payload.icon;
    if (!icon && appId) {
        const built = getApp(appId);
        if (built) icon = built.icon;
        else {
            const ext = state.apps.external.find((a) => a.id === appId);
            if (ext) icon = ext.icon;
        }
    }

    dispatch(
        showToast({
            id: Date.now(),
            type: payload.type || 'info',
            title: payload.title || '',
            body: payload.body || '',
            icon: icon || null,
            app: appId,
        }),
    );
};

export default toastSlice.reducer;