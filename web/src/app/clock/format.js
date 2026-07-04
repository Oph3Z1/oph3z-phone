// Shared time formatting for the Clock app.

export const pad2 = (n) => String(n).padStart(2, '0');

// Countdown / timer display: H:MM:SS when there are hours, else M:SS.
export function fmtCountdown(totalSecs) {
  const s = Math.max(0, Math.ceil(totalSecs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}

// Compact recents label: "5:00", "1:00:00".
export function fmtRecent(r) {
  const total = (r.h || 0) * 3600 + (r.m || 0) * 60 + (r.s || 0);
  return fmtCountdown(total);
}

// Stopwatch: MM:SS.CC (centiseconds), grows to H:MM:SS.CC past an hour.
export function fmtStopwatch(ms) {
  const total = Math.max(0, ms);
  const cs = Math.floor((total % 1000) / 10);
  const s = Math.floor(total / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}.${pad2(cs)}`;
  return `${pad2(m)}:${pad2(sec)}.${pad2(cs)}`;
}

// Remaining seconds left on a (possibly paused) local timer, given "now" ms.
export function timerRemaining(timer, now) {
  if (!timer) return 0;
  if (timer.paused) return Math.max(0, timer.remaining || 0);
  return Math.max(0, (timer.deadline - now) / 1000);
}
