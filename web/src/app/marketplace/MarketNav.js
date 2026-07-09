import { createContext, useContext } from 'react';

export const MarketNavContext = createContext(null);
export const useMarketNav = () => useContext(MarketNavContext);