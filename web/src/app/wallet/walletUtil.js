const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function group(intStr) {
  const neg = intStr.startsWith('-');
  const d = neg ? intStr.slice(1) : intStr;
  return (neg ? '-' : '') + d.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 24580 -> "$24,580"
export function fmtMoney(n) {
  return '$' + group(String(Math.round(Number(n) || 0)));
}

// Signed, for a transaction row: received -> +, sent/bill -> -
export function signedMoney(kind, amount) {
  const sign = kind === 'received' ? '+' : '−';
  return `${sign}${fmtMoney(amount)}`;
}

export function isCredit(kind) {
  return kind === 'received';
}

// Short list date.
export function txDate(ts) {
  const d = new Date((ts || 0) * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function initialOf(s) {
  const t = (s || '').trim();
  return t ? t[0].toUpperCase() : '$';
}

// Digits only (for entering a recipient number).
export const digitsOf = (s) => (s || '').replace(/\D/g, '');

// Format 7-digit phone number "5550142" -> "555-0142".
export function fmtNumber(digits) {
  const d = (digits || '').replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
}

// Longer date for the detailed transactions list: "Jul 5, 14:32".
export function txDateLong(ts) {
  const d = new Date((ts || 0) * 1000);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${time}`;
}
