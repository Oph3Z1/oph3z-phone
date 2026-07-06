import { createContext, useContext } from 'react';

// In-app navigation handed down to Marketplace screens (mirrors X's XNav).
export const MarketNavContext = createContext(null);
export const useMarketNav = () => useContext(MarketNavContext);
