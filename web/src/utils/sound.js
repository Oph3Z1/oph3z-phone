// Small sound helpers for the phone UI.

// One-shot playback of a file in web/public/audio (e.g. 'photosound.mp3').
export function playSound(file, volume = 1) {
  try {
    const a = new Audio(`./audio/${file}`);
    a.volume = volume;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) {
    /* no audio available */
  }
}

// ---- Synthesized iOS-style keypad tone (DTMF) ---------------------------- //
// The iPhone dialer plays the real telephone dual-tone for each key. We generate
// it with the Web Audio API so no sound file is needed.
let audioCtx = null;
function getCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Low/high frequency pair per key (standard DTMF).
const DTMF = {
  1: [697, 1209], 2: [697, 1336], 3: [697, 1477],
  4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
  7: [852, 1209], 8: [852, 1336], 9: [852, 1477],
  '*': [941, 1209], 0: [941, 1336], '#': [941, 1477], '+': [941, 1336],
};

export function playKeyTone(key, { duration = 0.11, volume = 0.10 } = {}) {
  const ctx = getCtx();
  if (!ctx) return;
  const pair = DTMF[key];
  if (!pair) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  // Quick attack + release so the tone doesn't click on/off.
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.004);
  gain.gain.setValueAtTime(volume, now + duration - 0.03);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  gain.connect(ctx.destination);

  pair.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + duration);
  });
}
