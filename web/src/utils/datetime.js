import { monthName, weekdayName as localWeekday } from '../i18n/dateNames';

export function weekdayName(index, short = false) {
    return localWeekday(index, short);
}

export function formatLongDate(date) {
    return `${localWeekday(date.getDay(), true)}, ${monthName(date.getMonth())} ${date.getDate()}`;
}

export function formatClock(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}