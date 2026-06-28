// Small environment helpers shared across the app.

// True when the app runs in a normal browser (npm run dev) rather than inside
// FiveM's NUI/CEF. Lets us mock backend data during development.
export const isEnvBrowser = () => !window.invokeNative;

// Clamp helper.
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Pad a number to two digits ("7" -> "07").
export const pad2 = (n) => String(n).padStart(2, '0');
