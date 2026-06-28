import { useEffect, useRef } from 'react';

// Try these in order; mp3 first since that's what's provided.
const EXTS = ['mp3', 'ogg', 'wav'];

// Play `name` on the given <audio>, falling back to the next extension if the
// current one fails to load/play (so a missing .ogg doesn't kill a present .mp3).
function playWithFallback(audio, name, loop) {
  audio.loop = loop;
  let i = 0;
  const attempt = () => {
    if (i >= EXTS.length) return;
    audio.src = `./audio/${name}.${EXTS[i++]}`;
    audio.currentTime = 0;
    const p = audio.play();
    if (p && p.catch) p.catch(() => attempt());
  };
  attempt();
}

/**
 * 2D (caller-only) call sounds:
 *   outgoing -> looping ring-back, ended -> end beep, failed -> busy tone.
 * The incoming ringtone is a 3D world sound handled by xsound (server-side).
 */
export function useCallAudio(callState) {
  const ringback = useRef(null);
  if (!ringback.current) ringback.current = new Audio();

  useEffect(() => {
    const rb = ringback.current;
    return () => {
      if (rb) {
        rb.pause();
        rb.src = '';
      }
    };
  }, []);

  useEffect(() => {
    // Always stop the ring-back loop first.
    ringback.current.pause();
    ringback.current.currentTime = 0;

    if (callState === 'outgoing') {
      playWithFallback(ringback.current, 'ringback', true);
    } else if (callState === 'ended') {
      playWithFallback(new Audio(), 'end', false);
    } else if (callState === 'failed') {
      playWithFallback(new Audio(), 'busy', false);
    }
  }, [callState]);
}
