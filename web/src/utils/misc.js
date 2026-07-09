export const isEnvBrowser = () => !window.invokeNative;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const pad2 = (n) => String(n).padStart(2, '0');