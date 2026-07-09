import { useSelector } from 'react-redux';
import { useSpotify } from './ctx';
import { fmtTime, gradientFor } from './util';
import { MoreIcon, NoteIcon, Waveform } from './icons';

export default function TrackRow({ track, queue, index, playlistId }) {
    const sp = useSpotify();
    const currentId = useSelector((s) => s.spotify.trackId);
    const playing = useSelector((s) => s.music.playing);
    const isCurrent = currentId && String(currentId) === String(track.id);

    return (
        <div
            className={`sp-row${isCurrent ? ' is-current' : ''}`}
            onClick={() => sp.play(track, queue, index)}
        >
            <div
                className="sp-row__art"
                style={
                    track.artwork
                        ? { backgroundImage: `url(${track.artwork})` }
                        : { background: gradientFor(track.title) }
                }
            >
                {!track.artwork && <NoteIcon size={18} />}
                {isCurrent && (
                    <span className="sp-row__wave">
                        <Waveform size={13} on={playing} />
                    </span>
                )}
            </div>
            <div className="sp-row__meta">
                <div className="sp-row__title">{track.title}</div>
                <div className="sp-row__artist">{track.artist || '—'}</div>
            </div>
            {track.duration ? <span className="sp-row__dur">{fmtTime(track.duration)}</span> : null}
            <button
                className="sp-row__more"
                onClick={(e) => {
                    e.stopPropagation();
                    sp.openMenu(track, playlistId);
                }}
                aria-label="More"
            >
                <MoreIcon size={18} />
            </button>
        </div>
    );
}