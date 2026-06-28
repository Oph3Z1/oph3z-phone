// Date/weather formatting helpers for the lock screen.

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayName(index, short = false) {
  const arr = short ? WEEKDAYS_SHORT : WEEKDAYS;
  return arr[((index % 7) + 7) % 7];
}

// Lock-screen weather glyph per category (sent from Lua).
const WEATHER_GLYPH = {
  clear: '☀️',
  cloudy: '☁️',
  fog: '🌫️',
  rain: '🌧️',
  thunder: '⛈️',
  snow: '❄️',
};

export function weatherGlyph(category) {
  return WEATHER_GLYPH[category] || WEATHER_GLYPH.clear;
}
