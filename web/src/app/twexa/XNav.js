import { createContext, useContext } from 'react';

export const XNavContext = createContext(null);
export const useXNav = () => useContext(XNavContext) || {};