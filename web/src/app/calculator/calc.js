// Calculator math + number formatting (framework-free, no Intl dependency).

export const OPS = { '÷': (a, b) => a / b, '×': (a, b) => a * b, '−': (a, b) => a - b, '+': (a, b) => a + b };

export function operate(a, op, b) {
  const fn = OPS[op];
  return fn ? fn(a, b) : b;
}

// Trim float noise and return a plain (ungrouped) numeric string.
export function stripNum(n) {
  if (!isFinite(n)) return 'Error';
  const r = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return String(r);
}

// Group the integer part with thousands separators.
function group(intStr) {
  const neg = intStr.startsWith('-');
  const digits = neg ? intStr.slice(1) : intStr;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// A finished number -> grouped display ("63,000", "999.5").
export function formatNumber(n) {
  if (typeof n !== 'number' || !isFinite(n)) return 'Error';
  const s = stripNum(n);
  const [int, dec] = s.split('.');
  return dec ? `${group(int)}.${dec}` : group(int);
}

// An in-progress typed string -> grouped display, preserving a trailing dot.
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
