import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_LAYOUT = [
    { id: 'call', label: 'Phone', place: 'dock', enabled: true },
    { id: 'message', label: 'Messages', place: 'dock', enabled: true },
    { id: 'camera', label: 'Camera', place: 'dock', enabled: true },
    { id: 'photos', label: 'Photos', place: 'dock', enabled: true },
    { id: 'maps', label: 'Maps', place: 'grid', enabled: true },
    { id: 'clock', label: 'Clock', place: 'grid', enabled: true },
    { id: 'settings', label: 'Settings', place: 'grid', enabled: true },
    { id: 'calculator', label: 'Calculator', place: 'grid', enabled: true },
    { id: 'appstore', label: 'App Store', place: 'grid', enabled: true },
];

const initialState = {
    layout: DEFAULT_LAYOUT,
    external: [],
};

const appsSlice = createSlice({
    name: 'apps',
    initialState,
    reducers: {
        setLayout(state, action) {
            if (Array.isArray(action.payload) && action.payload.length)
                state.layout = action.payload;
        },
        setExternalApps(state, action) {
            state.external = Array.isArray(action.payload) ? action.payload : [];
        },
    },
});

export const { setLayout, setExternalApps } = appsSlice.actions;

export const selectExternalApp = (id) => (state) =>
    state.apps.external.find((a) => a.id === id) || null;

export default appsSlice.reducer;