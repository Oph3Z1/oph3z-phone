import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

const initialState = {
    loaded: false,
    wallpaper: 'blackTitanium',
    brightness: 100,
    scale: 100,
    volume: 70,
    airdrop: false,
    airplane: false,
    notifSound: true,
    notifMaster: true,
    notifApps: {},
    ringtone: '',
    language: 'en',
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        hydrate(state, action) {
            return { ...state, ...(action.payload || {}), loaded: true };
        },
        applySetting(state, action) {
            const { key, value } = action.payload;
            state[key] = value;
        },
    },
});

export const { hydrate, applySetting } = settingsSlice.actions;

export const saveSetting = (key, value) => (dispatch) => {
    dispatch(applySetting({ key, value }));
    fetchNui('phone:saveSettings', { [key]: value }, { ok: true });
};

const persistTimers = {};
const pendingSettings = {};
export const saveSettingLive =
    (key, value, delay = 350) =>
    (dispatch) => {
        dispatch(applySetting({ key, value }));
        pendingSettings[key] = value;
        clearTimeout(persistTimers[key]);
        persistTimers[key] = setTimeout(() => {
            fetchNui('phone:saveSettings', { [key]: value }, { ok: true });
            delete persistTimers[key];
            delete pendingSettings[key];
        }, delay);
    };

export const flushSettings = () => () => {
    const keys = Object.keys(pendingSettings);
    if (keys.length === 0) return;
    const patch = {};
    for (const key of keys) {
        patch[key] = pendingSettings[key];
        clearTimeout(persistTimers[key]);
        delete persistTimers[key];
        delete pendingSettings[key];
    }
    fetchNui('phone:saveSettings', patch, { ok: true });
};

export const setAppNotif = (appId, value) => (dispatch, getState) => {
    const current = getState().settings.notifApps || {};
    const next = { ...current, [appId]: value };
    dispatch(applySetting({ key: 'notifApps', value: next }));
    fetchNui('phone:saveSettings', { notifApps: next }, { ok: true });
};

export const setAirplane = (value) => (dispatch) => {
    dispatch(applySetting({ key: 'airplane', value }));
    fetchNui('phone:phone:setAirplane', { value }, value);
};

export default settingsSlice.reducer;