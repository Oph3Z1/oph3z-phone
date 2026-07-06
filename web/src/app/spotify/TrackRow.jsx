import { useSelector } from 'react-redux';
import { useSpotify } from './ctx';
import { fmtTime, gradientFor } from './util';
import { MoreIcon, NoteIcon, Waveform } from './icons';

// One song row. Highlights + shows the animated bars when it's the playing track.
// `queue` = the list this row belongs to (so playing it sets up next/prev).
export default function TrackRow({ track, queue, index, playlistId }) {
  const sp = useSpotify();
  const currentId = useSelector((s) => s.spotify.trackId);
  const playing = useSelector((s) => s.music.playing);
  const isCurrent = currentId && String(currentId) === String(track.id);

  return (
    <div className={`sp-row${isCurrent ? ' is-current' : ''}`} onClick={() => sp.play(track, queue, index)}>
      <div className="sp-row__art" style={track.artwork ? undefined : { background: gradientFor(track.title) }}>
        {track.artwork ? <img src={track.artwork} alt="" /> : <NoteIcon size={18} />}
        {isCurrent && <span className="sp-row__wave"><Waveform size={13} on={playing} /></span>}
      </div>
      <div className="sp-row__meta">
        <div className="sp-row__title">{track.title}</div>
        <div className="sp-row__artist">{track.artist || '—'}</div>
      </div>
      {track.duration ? <span className="sp-row__dur">{fmtTime(track.duration)}</span> : null}
      <button className="sp-row__more" onClick={(e) => { e.stopPropagation(); sp.openMenu(track, playlistId); }} aria-label="More">
        <MoreIcon size={18} />
      </button>
    </div>
  );
}
