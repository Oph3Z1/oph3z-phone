import { useRef, useState } from 'react';
import { pad2 } from '../../../utils/misc';

// Static waveform shape (purely decorative; fills as the note plays).
const BARS = [38, 64, 50, 82, 58, 92, 46, 72, 42, 60, 88, 52, 70, 40, 78, 48, 62, 34];

const fmt = (s) => `${pad2(Math.floor(s / 60))}:${pad2(Math.round(s) % 60)}`;

// An iMessage-style voice note: play/pause + a waveform that fills with progress.
export default function VoiceBubble({ msg, out }) {
  const duration = (msg.meta && msg.meta.duration) || 0;
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [elapsed, setElapsed] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setElapsed(a.currentTime);
    if (a.duration && isFinite(a.duration)) setProgress(a.currentTime / a.duration);
  };

  // Tap (or drag) the waveform to fast-forward / rewind.
  const barsRef = useRef(null);
  const seekTo = (clientX) => {
    const a = audioRef.current;
    const el = barsRef.current;
    if (!a || !el) return;
    const dur = a.duration && isFinite(a.duration) ? a.duration : duration;
    if (!dur) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = frac * dur;
    setProgress(frac);
    setElapsed(frac * dur);
  };
  const onBarsDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekTo(e.clientX);
  };
  const onBarsMove = (e) => {
    if (e.buttons) seekTo(e.clientX); // dragging
  };

  return (
    <div className={`msg-voice ${out ? 'is-out' : 'is-in'}`}>
      <button className="msg-voice__play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div
        className="msg-voice__bars"
        ref={barsRef}
        onPointerDown={onBarsDown}
        onPointerMove={onBarsMove}
      >
        {BARS.map((h, i) => (
          <span key={i} className={i / BARS.length <= progress ? 'is-on' : ''} style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className="msg-voice__time">{fmt(playing || elapsed ? elapsed : duration)}</span>
      <audio
        ref={audioRef}
        src={msg.body}
        preload="metadata"
        onTimeUpdate={onTime}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setElapsed(0);
        }}
      />
    </div>
  );
}
