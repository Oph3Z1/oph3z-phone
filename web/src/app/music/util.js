// m:ss from seconds.
export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Deterministic gradient for a playlist/track with no artwork, from its name.
const GRADS = [
  ['#fb2c48', '#3d0b16'], ['#ff5a6e', '#33141a'], ['#f43554', '#2e0a12'],
  ['#ff6b7d', '#3a1218'], ['#e02540', '#25080e'], ['#ff5c6e', '#33101a'],
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

// Time-of-day greeting for the home header.
export function greeting(t) {
  const h = new Date().getHours();
  if (h < 5) return t('spotify.greetNight');
  if (h < 12) return t('spotify.greetMorning');
  if (h < 18) return t('spotify.greetAfternoon');
  return t('spotify.greetEvening');
}
