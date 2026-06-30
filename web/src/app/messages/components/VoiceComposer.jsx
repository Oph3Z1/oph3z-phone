import { useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../../utils/fetchNui';
import { uploadToProvider } from '../../../utils/upload';
import { pad2 } from '../../../utils/misc';

const fmt = (s) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;

// Records a voice note via the mic (MediaRecorder + getUserMedia) with pause/resume,
// then uploads it and hands back the URL + duration. If the mic is unavailable (CEF
// often blocks it), it fails gracefully via onError + onCancel.
export default function VoiceComposer({ onComplete, onCancel, onError }) {
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [uploading, setUploading] = useState(false);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);

  // Elapsed-time tracking that excludes paused stretches.
  const accumRef = useRef(0); // ms recorded before the current segment
  const segStartRef = useRef(0); // start of the current (un-paused) segment
  const pausedRef = useRef(false);
  const tickRef = useRef(null);

  const elapsedMs = () => accumRef.current + (pausedRef.current ? 0 : Date.now() - segStartRef.current);
  const startTick = () => {
    stopTick();
    tickRef.current = setInterval(() => setSeconds(Math.floor(elapsedMs() / 1000)), 250);
  };
  const stopTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const finish = async () => {
    stopTick();
    stopStream();
    if (cancelledRef.current) return;
    const duration = Math.max(1, Math.round(elapsedMs() / 1000));
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setUploading(true);
    const cfg = await fetchNui('phone:media:config', {}, {});
    const url = await uploadToProvider(blob, 'voice.webm', cfg);
    setUploading(false);
    if (url) onComplete && onComplete(url, duration);
    else {
      onError && onError();
      onCancel && onCancel();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        let rec;
        try {
          rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        } catch (e) {
          rec = new MediaRecorder(stream);
        }
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = finish;
        accumRef.current = 0;
        segStartRef.current = Date.now();
        rec.start();
        recRef.current = rec;
        startTick();
      } catch (e) {
        console.error('[voice] mic unavailable', e);
        onError && onError();
        onCancel && onCancel();
      }
    })();
    return () => {
      stopTick();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    const rec = recRef.current;
    if (!rec || uploading) return;
    if (pausedRef.current) {
      // Resume.
      segStartRef.current = Date.now();
      pausedRef.current = false;
      setPaused(false);
      if (rec.state === 'paused') rec.resume();
      startTick();
    } else {
      // Pause.
      accumRef.current += Date.now() - segStartRef.current;
      pausedRef.current = true;
      setPaused(true);
      if (rec.state === 'recording') rec.pause();
      stopTick();
      setSeconds(Math.floor(elapsedMs() / 1000));
    }
  };

  const send = () => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  };
  const cancel = () => {
    cancelledRef.current = true;
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    stopTick();
    stopStream();
    onCancel && onCancel();
  };

  return (
    <div className="msg-voicerec">
      <button className="msg-voicerec__cancel" onClick={cancel} aria-label="Cancel">
        ✕
      </button>

      <div className={`msg-voicerec__live${paused ? ' is-paused' : ''}`}>
        <span className="msg-voicerec__dot" />
        <div className="msg-voicerec__bars">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${(i % 8) * 0.07}s` }} />
          ))}
        </div>
        <span className="msg-voicerec__time">{fmt(seconds)}</span>
      </div>

      <button
        className="msg-voicerec__pause"
        onClick={togglePause}
        disabled={uploading}
        aria-label={paused ? 'Resume' : 'Pause'}
      >
        {paused ? (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
      </button>

      <button className="msg-voicerec__send" onClick={send} disabled={uploading} aria-label="Send">
        {uploading ? (
          <span className="msg-voicerec__spin" />
        ) : (
          <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l7 7h-4v8h-6v-8H5l7-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
