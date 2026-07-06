import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { setTrack, setPlaying, setPosition, clearTrack } from './musicSlice';

// Spotify app state. The *now-playing* metadata (title/artist/artwork/position/
// playing/duration) is mirrored into `musicSlice` so the Control Center mini
// player and the Dynamic Island stay in sync; this slice holds the app-specific
// bits (library, search, queue flags, nearby/volume) and the current track object.
const initialState = {
  allowNearby: false,   // config gate for the speaker toggle
  nearby: false,        // broadcasting to nearby players
  volume: 70,
  hasNext: false,
  hasPrev: false,
  trackId: null,        // id of the playing track (to highlight rows)
  current: null,        // full current track object (for like / share)
  library: { playlists: [], liked: [] },
  search: { q: '', results: [], loading: false, done: false },
};

const spotifySlice = createSlice({
  name: 'spotify',
  initialState,
  reducers: {
    setNowMeta(state, action) {
      Object.assign(state, action.payload || {});
    },
    clearNow(state) {
      state.trackId = null;
      state.current = null;
      state.hasNext = false;
      state.hasPrev = false;
    },
    setLibrary(state, action) {
      state.library = action.payload || { playlists: [], liked: [] };
    },
    setSearch(state, action) {
      state.search = { ...state.search, ...(action.payload || {}) };
    },
  },
});

export const { setNowMeta, clearNow, setLibrary, setSearch } = spotifySlice.actions;

// ---- thunks ---------------------------------------------------------------

// Apply a track-change event from the engine to both slices.
export const applyTrack = (d) => (dispatch) => {
  const t = d.track || {};
  dispatch(setTrack({
    title: t.title || '', artist: t.artist || '', artwork: t.artwork || null,
    playing: !!d.playing, position: 0, duration: t.duration || 0,
  }));
  dispatch(setNowMeta({
    trackId: t.id || null, current: t.id ? t : null, nearby: !!d.nearby,
    volume: d.volume ?? 70, hasNext: !!d.hasNext, hasPrev: !!d.hasPrev,
  }));
};

// Restore the whole player from the client engine (on phone open / app mount).
export const loadSpotifyState = () => async (dispatch) => {
  const s = await fetchNui('phone:spotify:state', {}, { ok: true });
  if (!s || !s.ok) return;
  if (s.track) {
    dispatch(setTrack({
      title: s.track.title || '', artist: s.track.artist || '', artwork: s.track.artwork || null,
      playing: !!s.playing, position: s.position || 0, duration: s.track.duration || 0,
    }));
  } else {
    dispatch(clearTrack());
  }
  dispatch(setNowMeta({
    allowNearby: !!s.allowNearby, nearby: !!s.nearby, volume: s.volume ?? 70,
    hasNext: !!s.hasNext, hasPrev: !!s.hasPrev,
    trackId: s.track ? s.track.id : null, current: s.track || null,
  }));
};

export const loadLibrary = () => async (dispatch) => {
  const r = await fetchNui('phone:spotify:library', {}, { ok: true, playlists: [], liked: [] });
  if (r && r.ok) dispatch(setLibrary({ playlists: r.playlists || [], liked: r.liked || [] }));
};

// Engine tick -> live position + playing state.
export const applyTick = (d) => (dispatch) => {
  dispatch(setPosition(d.position || 0));
  dispatch(setPlaying(!!d.playing));
};

export default spotifySlice.reducer;
