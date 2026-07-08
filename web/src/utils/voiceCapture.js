// Background microphone capture for the Camera app's "nearby voice" video mode.
//
// This runs on EVERY nearby player's phone NUI (even while their phone is
// closed — the React root stays mounted), triggered by Lua. It records an
// audio-only, low-bitrate Opus clip gated by the player's voice/talking state,
// so a player is only captured while they are actually transmitting voice. The
// finished clips are uploaded and mixed onto the recorder's video server-side.
//
// It is deliberately tiny and self-contained: one mic stream, one gain "gate",
// one MediaRecorder. Everything is torn down on stop so nothing lingers.

let active = null;

function supported() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    (window.AudioContext || window.webkitAudioContext)
  );
}

// Begin capturing. `gate` = true means start muted and only open the gate while
// the player is talking (setTalking drives it). Returns quickly; failures are
// swallowed so a missing mic / denied permission simply yields no clip.
export async function startVoiceCapture(gate) {
  await stopVoiceCapture(); // never run two at once
  if (!supported()) return false;

  const session = { stopped: false };
  active = session;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    // A stop() may have landed while getUserMedia was resolving.
    if (session.stopped) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const src = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = gate ? 0 : 1; // gated: silent until the player talks
    const dest = ctx.createMediaStreamDestination();
    src.connect(gain);
    gain.connect(dest);

    let mime = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'audio/webm';
    const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 24000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    Object.assign(session, { stream, ctx, gain, rec, chunks, gate, spoke: !gate, mime });
    rec.start();
    return true;
  } catch (e) {
    // Denied / no device / not allowed in this CEF build — contribute nothing.
    if (active === session) active = null;
    return false;
  }
}

// Open/close the gate as the player starts/stops talking. Smoothed to avoid
// audible clicks. Marks that the player spoke at least once (else the clip is
// dropped as empty).
export function setVoiceGate(talking) {
  const s = active;
  if (!s || !s.gate || !s.gain || !s.ctx) return;
  const now = s.ctx.currentTime;
  const g = s.gain.gain;
  g.cancelScheduledValues(now);
  g.setTargetAtTime(talking ? 1 : 0, now, 0.02);
  if (talking) s.spoke = true;
}

// Stop capturing and return the recorded Blob (or null if nothing usable was
// captured). Fully tears down the mic + audio graph.
export function stopVoiceCapture() {
  const s = active;
  active = null;
  if (!s) return Promise.resolve(null);
  s.stopped = true;

  return new Promise((resolve) => {
    const cleanup = () => {
      try { if (s.stream) s.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      try { if (s.ctx && s.ctx.state !== 'closed') s.ctx.close(); } catch (_) {}
    };

    if (!s.rec || s.rec.state === 'inactive') {
      cleanup();
      resolve(null);
      return;
    }

    s.rec.onstop = () => {
      cleanup();
      if (!s.spoke || s.chunks.length === 0) { resolve(null); return; }
      const blob = new Blob(s.chunks, { type: s.mime });
      resolve(blob.size > 0 ? blob : null);
    };
    try { s.rec.stop(); } catch (_) { cleanup(); resolve(null); }
  });
}
