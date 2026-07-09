import { createContext, useContext } from 'react';

// Shared actions handed down to Spotify screens (play a track, open the track
// menu / share sheet, open the full Now Playing view).
export const SpotifyCtx = createContext(null);
export const useSpotify = () => useContext(SpotifyCtx);
