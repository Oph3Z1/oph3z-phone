import { createContext, useContext } from 'react';

export const SpotifyCtx = createContext(null);
export const useSpotify = () => useContext(SpotifyCtx);