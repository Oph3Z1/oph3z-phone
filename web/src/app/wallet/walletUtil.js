import { monthName } from '../../i18n/dateNames';

function group(intStr) {
    const neg = intStr.startsWith('-');
    const d = neg ? intStr.slice(1) : intStr;
    return (neg ? '-' : '') + d.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtMoney(n) {
    return '$' + group(String(Math.round(Number(n) || 0)));
}

export function signedMoney(kind, amount) {
    const sign = kind === 'received' ? '+' : '−';
    return `${sign}${fmtMoney(amount)}`;
}

export function isCredit(kind) {
    return kind === 'received';
}

export function txDate(ts) {
    const d = new Date((ts || 0) * 1000);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${monthName(d.getMonth(), true)} ${d.getDate()}`;
}

export function initialOf(s) {
    const t = (s || '').trim();
    return t ? t[0].toUpperCase() : '$';
}

export const digitsOf = (s) => (s || '').replace(/\D/g, '');

export function fmtNumber(digits) {
    const d = (digits || '').replace(/\D/g, '');
    return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
}

export function txDateLong(ts) {
    const d = new Date((ts || 0) * 1000);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${monthName(d.getMonth(), true)} ${d.getDate()}, ${time}`;
}