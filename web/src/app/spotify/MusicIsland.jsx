import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { openApp, unlock } from '../../store/slices/phoneSlice';
import { fmtTime, gradientFor } from './util';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, NoteIcon, Waveform } from './icons';

// The music Dynamic Island. Shows only while a track is PLAYING and you're not
// inside Spotify, not on the lock screen (there's a lock-screen widget for that),
// and not in a call. Compact = a wide notch pill (art + audio waves); tap to
// expand into a full player; tap the artwork/title to jump into the app; tap the
// blank screen area to collapse it again.
export default function MusicIsland() {
  const dispatch = useDispatch();
  const music = useSelector((s) => s.music);
  const activeApp = useSelector((s) => s.phone.activeApp);
  const locked = useSelector((s) => s.phone.locked);
  const inCall = useSelector((s) => !!s.call.state);
  const hasNext = useSelector((s) => s.spotify.hasNext);
  const hasPrev = useSelector((s) => s.spotify.hasPrev);
  const [expanded, setExpanded] = useState(false);

  // Collapse whenever the island would hide, so it reopens compact next time.
  const hidden = !music.title || activeApp === 'spotify' || locked || inCall || (!music.playing && !expanded);
  useEffect(() => { if (hidden) setExpanded(false); }, [hidden]);
  if (hidden) return null;

  const openApp_ = () => { dispatch(unlock()); dispatch(openApp('spotify')); };
  const toggle = (e) => { e.stopPropagation(); fetchNui('phone:spotify:toggle', {}, {}); };
  const next = (e) => { e.stopPropagation(); fetchNui('phone:spotify:next', {}, {}); };
  const prev = (e) => { e.stopPropagation(); fetchNui('phone:spotify:prev', {}, {}); };
  const pct = music.duration ? Math.min(100, (music.position / music.duration) * 100) : 0;

  const Art = ({ size }) => (
    <span className="sp-isl__art" style={{ width: size, height: size, ...(music.artwork ? {} : { background: gradientFor(music.title) }) }}>
      {music.artwork ? <img src={music.artwork} alt="" /> : <NoteIcon size={parseFloat(size) * 8} />}
    </span>
  );

  if (!expanded) {
    return (
      <div className="sp-isl sp-isl--compact" onClick={() => setExpanded(true)}>
        <Art size="1.5em" />
        <span className="sp-isl__wave"><Waveform size={12} on={music.playing} /></span>
      </div>
    );
  }

  return (
    <>
      {/* Click anywhere off the island to collapse it. */}
      <div className="sp-isl__backdrop" onClick={() => setExpanded(false)} />
      <div className="sp-isl sp-isl--expanded">
        <div className="sp-isl__top" onClick={openApp_}>
          <Art size="3.1em" />
          <div className="sp-isl__meta">
            <div className="sp-isl__title">{music.title}</div>
            <div className="sp-isl__artist">{music.artist || '—'}</div>
          </div>
          <span className="sp-isl__wave sp-isl__wave--big"><Waveform size={24} on={music.playing} /></span>
        </div>

        <div className="sp-isl__track"><span className="sp-isl__fill" style={{ width: `${pct}%` }} /></div>
        <div className="sp-isl__times"><span>{fmtTime(music.position)}</span><span>{fmtTime(music.duration)}</span></div>

        <div className="sp-isl__ctl">
          <button onClick={prev} disabled={!hasPrev}><PrevIcon size={26} /></button>
          <button className="sp-isl__play" onClick={toggle}>{music.playing ? <PauseIcon size={26} /> : <PlayIcon size={26} />}</button>
          <button onClick={next} disabled={!hasNext}><NextIcon size={26} /></button>
        </div>
      </div>
    </>
  );
}
