import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

const initialState = {
    visible: false,
    locked: true,
    activeApp: null,
    flashlightOn: false,
    controlCenterOpen: false,
    launchTab: null,
    identity: { number: '', numberRaw: '', citizenid: '', name: '', email: '', avatar: '' },
    time: {
        useGameTime: true,
        hours: 11,
        minutes: 34,
        day: 7,
        month: 6,
        weekday: 3,
        year: 2025,
        weather: 0,
        temperature: 70,
        tempUnit: 'F',
    },
};

const phoneSlice = createSlice({
    name: 'phone',
    initialState,
    reducers: {
        setVisible(state, action) {
            state.visible = action.payload;
            if (!action.payload) {
                state.locked = true;
                state.activeApp = null;
                state.flashlightOn = false;
                state.controlCenterOpen = false;
            }
        },
        setFlashlight(state, action) {
            state.flashlightOn = action.payload;
        },
        setControlCenter(state, action) {
            state.controlCenterOpen = !!action.payload;
        },
        toggleControlCenter(state) {
            state.controlCenterOpen = !state.controlCenterOpen;
        },
        lock(state) {
            state.locked = true;
            state.activeApp = null;
            state.controlCenterOpen = false;
        },
        unlock(state) {
            state.locked = false;
        },
        openApp(state, action) {
            state.activeApp = action.payload;
        },
        closeApp(state) {
            state.activeApp = null;
        },
        setLaunchTab(state, action) {
            state.launchTab = action.payload;
        },
        setIdentity(state, action) {
            state.identity = { ...state.identity, ...(action.payload || {}) };
        },
        setTime(state, action) {
            state.time = { ...state.time, ...action.payload };
        },
    },
});

export const {
    setVisible,
    lock,
    unlock,
    openApp,
    closeApp,
    setTime,
    setFlashlight,
    setControlCenter,
    toggleControlCenter,
    setLaunchTab,
    setIdentity,
} = phoneSlice.actions;

export const saveProfileName = (name) => async (dispatch) => {
    const clean = (name || '').trim();
    if (!clean) return;
    dispatch(setIdentity({ name: clean }));
    await fetchNui('phone:profile:setName', { name: clean }, clean);
};

export const saveAvatar = (url) => async (dispatch) => {
    const clean = (url || '').trim();
    dispatch(setIdentity({ avatar: clean }));
    await fetchNui('phone:profile:setAvatar', { url: clean }, clean);
};

export default phoneSlice.reducer;