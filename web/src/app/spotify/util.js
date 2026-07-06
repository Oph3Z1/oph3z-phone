// m:ss from seconds.
export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Deterministic gradient for a playlist/track with no artwork, from its name.
const GRADS = [
  ['#1db954', '#0b3d24'], ['#2ad17e', '#14332a'], ['#1ed760', '#0a2e1c'],
  ['#3be37a', '#123a2c'], ['#17a34a', '#08251a'], ['#4ade80', '#0e3324'],
];
function hash(str) {
  const key = String(str || '?');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}
export function gradientFor(str) {
  const [a, b] = GRADS[hash(str) % GRADS.length];
  return `linear-gradient(145deg, ${a}, ${b})`;
}
// A single accent COLOR (not a gradient) — safe to embed as a color stop.
export function colorFor(str) {
  return GRADS[hash(str) % GRADS.length][0];
}
