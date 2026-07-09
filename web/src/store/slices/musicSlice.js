import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    title: '',
    artist: '',
    artwork: null,
    playing: false,
    position: 0,
    duration: 0,
};

const musicSlice = createSlice({
    name: 'music',
    initialState,
    reducers: {
        setTrack(state, action) {
            return { ...state, ...(action.payload || {}) };
        },
        setPlaying(state, action) {
            state.playing = !!action.payload;
        },
        togglePlaying(state) {
            if (state.title) state.playing = !state.playing;
        },
        setPosition(state, action) {
            state.position = action.payload || 0;
        },
        clearTrack() {
            return initialState;
        },
    },
});

export const { setTrack, setPlaying, togglePlaying, setPosition, clearTrack } = musicSlice.actions;
export default musicSlice.reducer;