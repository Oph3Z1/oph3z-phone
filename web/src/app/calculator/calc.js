export const OPS = {
    '÷': (a, b) => a / b,
    '×': (a, b) => a * b,
    '−': (a, b) => a - b,
    '+': (a, b) => a + b,
};

export function operate(a, op, b) {
    const fn = OPS[op];
    return fn ? fn(a, b) : b;
}

export function stripNum(n) {
    if (!isFinite(n)) return 'Error';
    const r = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
    return String(r);
}

function group(intStr) {
    const neg = intStr.startsWith('-');
    const digits = neg ? intStr.slice(1) : intStr;
    return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatNumber(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 'Error';
    const s = stripNum(n);
    const [int, dec] = s.split('.');
    return dec ? `${group(int)}.${dec}` : group(int);
}

export function formatDisplay(s) {
    if (s === 'Error') return s;
    const neg = s.startsWith('-');
    const body = neg ? s.slice(1) : s;
    const hasDot = body.includes('.');
    const [int, dec] = body.split('.');
    let out = group(int || '0');
    if (hasDot) out += '.' + (dec || '');
    return (neg ? '-' : '') + out;
}