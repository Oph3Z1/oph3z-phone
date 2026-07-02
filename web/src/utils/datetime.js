// Date formatting helpers for the lock screen / notification center.

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function weekdayName(index, short = false) {
  const arr = short ? WEEKDAYS_SHORT : WEEKDAYS;
  return arr[((index % 7) + 7) % 7];
}

// A JS Date -> "Wed, July 1".
export function formatLongDate(date) {
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

// A JS Date -> "HH:MM" (24h, zero-padded).
export function formatClock(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
