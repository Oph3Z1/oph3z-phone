import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from './icons';
import { fmtDuration, readDuration } from './duration';

export default function VideoPlayer({ src, poster }) {
    const ref = useRef(null);
    const [playing, setPlaying] = useState(true);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const seeking = useRef(false);

    useEffect(() => {
        setTime(0);
        setDuration(0);
        setPlaying(true);
    }, [src]);

    const onLoaded = (e) => readDuration(e.target, setDuration);
    const onTime = (e) => {
        if (!seeking.current) setTime(e.target.currentTime);
    };

    const toggle = () => {
        const v = ref.current;
        if (!v) return;
        if (v.paused) {
            v.play();
            setPlaying(true);
        } else {
            v.pause();
            setPlaying(false);
        }
    };

    const onSeek = (e) => {
        const v = ref.current;
        if (!v || !isFinite(duration)) return;
        const t = Number(e.target.value) * duration;
        setTime(t);
        v.currentTime = t;
    };

    const pct = duration > 0 ? Math.min(1, time / duration) : 0;

    return (
        <div className="ph-vp">
            <video
                ref={ref}
                className="ph-vp__video"
                src={src}
                poster={poster}
                autoPlay
                playsInline
                onClick={toggle}
                onLoadedMetadata={onLoaded}
                onTimeUpdate={onTime}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
            />

            {!playing && (
                <button className="ph-vp__big" onClick={toggle} aria-label="Play">
                    <PlayIcon />
                </button>
            )}

            <div
                className="ph-vp__bar"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
            >
                <button
                    className="ph-vp__play"
                    onClick={toggle}
                    aria-label={playing ? 'Pause' : 'Play'}
                >
                    {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <span className="ph-vp__time">{fmtDuration(time)}</span>
                <input
                    className="ph-vp__seek"
                    type="range"
                    min={0}
                    max={1}
                    step="any"
                    value={pct}
                    style={{ '--p': `${pct * 100}%` }}
                    onPointerDown={() => (seeking.current = true)}
                    onPointerUp={() => (seeking.current = false)}
                    onChange={onSeek}
                />
                <span className="ph-vp__time">{fmtDuration(duration)}</span>
            </div>
        </div>
    );
}