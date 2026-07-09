import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { fmtTime, gradientFor } from './util';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, NoteIcon } from './icons';

export default function LockMusicWidget() {
    const music = useSelector((s) => s.music);
    const hasNext = useSelector((s) => s.spotify.hasNext);
    const hasPrev = useSelector((s) => s.spotify.hasPrev);
    const [seek, setSeek] = useState(null);

    const [active, setActive] = useState(() => music.playing);
    useEffect(() => {
        if (music.playing) setActive(true);
    }, [music.playing]);

    if (!music.title || !active) return null;

    const dur = music.duration || 0;
    const pos = seek != null ? seek : music.position;
    const remain = Math.max(0, dur - pos);
    const commit = (v) => {
        fetchNui('phone:spotify:seek', { position: v }, {});
        setSeek(null);
    };

    return (
        <div
            className="lockmusic"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >
            <div className="lockmusic__head">
                <span
                    className="lockmusic__art"
                    style={music.artwork ? undefined : { background: gradientFor(music.title) }}
                >
                    {music.artwork ? <img src={music.artwork} alt="" /> : <NoteIcon size={20} />}
                </span>
                <div className="lockmusic__meta">
                    <div className="lockmusic__title">{music.title}</div>
                    <div className="lockmusic__artist">{music.artist || '—'}</div>
                </div>
            </div>

            <input
                className="lockmusic__seek"
                type="range"
                min={0}
                max={Math.max(dur, 1)}
                step={1}
                value={Math.min(pos, dur || 1)}
                onChange={(e) => setSeek(Number(e.target.value))}
                onPointerUp={(e) => commit(Number(e.target.value))}
            />
            <div className="lockmusic__times">
                <span>{fmtTime(pos)}</span>
                <span>-{fmtTime(remain)}</span>
            </div>

            <div className="lockmusic__ctl">
                <button onClick={() => fetchNui('phone:spotify:prev', {}, {})} disabled={!hasPrev}>
                    <PrevIcon size={26} />
                </button>
                <button onClick={() => fetchNui('phone:spotify:toggle', {}, {})}>
                    {music.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
                </button>
                <button onClick={() => fetchNui('phone:spotify:next', {}, {})} disabled={!hasNext}>
                    <NextIcon size={26} />
                </button>
            </div>
        </div>
    );
}