import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { setTrack, setPlaying, setPosition, clearTrack } from './musicSlice';

const initialState = {
    allowNearby: false,
    nearby: false,
    volume: 70,
    hasNext: false,
    hasPrev: false,
    trackId: null,
    current: null,
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

export const applyTrack = (d) => (dispatch) => {
    const t = d.track || {};
    dispatch(
        setTrack({
            title: t.title || '',
            artist: t.artist || '',
            artwork: t.artwork || null,
            playing: !!d.playing,
            position: 0,
            duration: t.duration || 0,
        }),
    );
    dispatch(
        setNowMeta({
            trackId: t.id || null,
            current: t.id ? t : null,
            nearby: !!d.nearby,
            volume: d.volume ?? 70,
            hasNext: !!d.hasNext,
            hasPrev: !!d.hasPrev,
        }),
    );
};

export const loadSpotifyState = () => async (dispatch) => {
    const s = await fetchNui('phone:spotify:state', {}, { ok: true });
    if (!s || !s.ok) return;
    if (s.track) {
        dispatch(
            setTrack({
                title: s.track.title || '',
                artist: s.track.artist || '',
                artwork: s.track.artwork || null,
                playing: !!s.playing,
                position: s.position || 0,
                duration: s.track.duration || 0,
            }),
        );
    } else {
        dispatch(clearTrack());
    }
    dispatch(
        setNowMeta({
            allowNearby: !!s.allowNearby,
            nearby: !!s.nearby,
            volume: s.volume ?? 70,
            hasNext: !!s.hasNext,
            hasPrev: !!s.hasPrev,
            trackId: s.track ? s.track.id : null,
            current: s.track || null,
        }),
    );
};

export const loadLibrary = () => async (dispatch) => {
    const r = await fetchNui('phone:spotify:library', {}, { ok: true, playlists: [], liked: [] });
    if (r && r.ok) dispatch(setLibrary({ playlists: r.playlists || [], liked: r.liked || [] }));
};

export const applyTick = (d) => (dispatch) => {
    dispatch(setPosition(d.position || 0));
    dispatch(setPlaying(!!d.playing));
};

export default spotifySlice.reducer;