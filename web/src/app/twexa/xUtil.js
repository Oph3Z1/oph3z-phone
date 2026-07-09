import { monthName } from '../../i18n/dateNames';

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

export function fullDate(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const date = `${monthName(d.getMonth(), true)} ${d.getDate()}, ${d.getFullYear()}`;
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${time} · ${date}`;
}

export function fmtCount(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`.replace('.0', '');
    return `${(n / 1_000_000).toFixed(1)}M`.replace('.0', '');
}

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

export const initialOf = (s) => (s || '?').trim().charAt(0).toUpperCase() || '?';