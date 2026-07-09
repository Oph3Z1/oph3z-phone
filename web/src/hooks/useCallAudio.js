import { useEffect, useRef } from 'react';

const EXTS = ['mp3', 'ogg', 'wav'];

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