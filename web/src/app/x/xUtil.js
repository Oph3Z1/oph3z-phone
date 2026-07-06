// Shared helpers for the X app.

// Compact "time ago" like X: 12s, 5m, 3h, 8mo, 2y — else a date.
export function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

// Longer "Jul 4, 2026 · 5:58 PM" for the post-detail timestamp.
export function fullDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${time} · ${date}`;
}

// 1234 -> 1.2K, 1200000 -> 1.2M.
export function fmtCount(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`.replace('.0', '');
  return `${(n / 1_000_000).toFixed(1)}M`.replace('.0', '');
}

// Tokenize text into runs of plain text, @mentions, #hashtags and URLs so the
// renderer can make the entity runs tappable (like the real X app).
const TOKEN_RE = /(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+|https?:\/\/[^\s]+)/g;
export function tokenize(text) {
  const str = String(text || '');
  const out = [];
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(str)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: str.slice(last, m.index) });
    const tok = m[0];
    if (tok[0] === '@') out.push({ type: 'mention', value: tok, handle: tok.slice(1) });
    else if (tok[0] === '#') out.push({ type: 'hashtag', value: tok, tag: tok.slice(1) });
    else out.push({ type: 'url', value: tok });
    last = m.index + tok.length;
  }
  if (last < str.length) out.push({ type: 'text', value: str.slice(last) });
  return out;
}

// First letter for an avatar fallback.
export const initialOf = (s) => (s || '?').trim().charAt(0).toUpperCase() || '?';
