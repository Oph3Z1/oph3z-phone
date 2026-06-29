// Format a duration (seconds) as M:SS.
export function fmtDuration(d) {
  if (!d || !isFinite(d) || d <= 0) return '0:00';
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Read a <video>'s real duration. webm files made by MediaRecorder report
// `Infinity` until you force a seek to the end — this does that, then restores.
export function readDuration(video, cb) {
  if (isFinite(video.duration) && video.duration > 0) {
    cb(video.duration);
    return;
  }
  const onUpdate = () => {
    if (isFinite(video.duration) && video.duration > 0) {
      video.removeEventListener('timeupdate', onUpdate);
      video.currentTime = 0;
      cb(video.duration);
    }
  };
  video.addEventListener('timeupdate', onUpdate);
  video.currentTime = 1e101; // jump past the end to make the browser compute it
}
