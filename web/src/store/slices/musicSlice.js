import { createSlice } from '@reduxjs/toolkit';

// Now-playing state for the mini player (Control Center) and the future Music app.
// Kept generic so a Music app can drive it via setTrack / setPlaying later.
const initialState = {
  title: '',      // '' -> "No Music Playing"
  artist: '',
  artwork: null,  // image url, or null for the placeholder note glyph
  playing: false,
  position: 0,    // seconds
  duration: 0,    // seconds
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
