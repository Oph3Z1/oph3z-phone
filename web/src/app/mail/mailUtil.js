const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// List timestamp: "HH:MM" if today, "Mon D" this year, else "M/D/YY".
export function mailDate(ts) {
  const d = new Date((ts || 0) * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (d.getFullYear() === now.getFullYear()) return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

// Full detail timestamp: "Sat, Jul 4 at 14:32".
export function mailDateFull(ts) {
  const d = new Date((ts || 0) * 1000);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${wd}, ${MONTHS[d.getMonth()]} ${d.getDate()} at ${time}`;
}

export function initialOf(s) {
  const t = (s || '').trim();
  return t ? t[0].toUpperCase() : '?';
}

export function snippet(body, n = 90) {
  return (body || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

// Deterministic avatar color from a string (system mail gets a neutral gray).
const COLORS = ['#0a84ff', '#ff9f0a', '#30d158', '#ff375f', '#bf5af2', '#64d2ff', '#ff9500', '#5e5ce6'];
export function avatarColor(seed, system) {
  if (system) return '#6c6c70';
  let h = 0;
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

// Basic email-address sanity check for the compose "To" field.
export function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());
}
