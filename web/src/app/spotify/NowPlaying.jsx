import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { saveSettingLive } from '../../store/slices/settingsSlice';
import { setNowMeta } from '../../store/slices/spotifySlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { fmtTime, gradientFor, colorFor } from './util';
import {
  ChevronDown, MoreIcon, PlayIcon, PauseIcon, NextIcon, PrevIcon,
  HeartIcon, ShareIcon, SpeakerIcon, HeadphoneIcon, VolumeIcon, NoteIcon,
} from './icons';

// The full-screen player: artwork, seekable progress, transport, volume (synced
// to the phone's media volume), like, share and the nearby speaker toggle.
export default function NowPlaying({ onClose, onShare }) {
  const t = useT();
  const dispatch = useDispatch();
  const music = useSelector((s) => s.music);
  const { current, nearby, allowNearby, hasNext, hasPrev, library } = useSelector((s) => s.spotify);
  const volume = useSelector((s) => s.settings.volume);
  const [seek, setSeek] = useState(null); // local drag value while scrubbing

  const liked = current && (library.liked || []).some((tk) => String(tk.id) === String(current.id));
  const pos = seek != null ? seek : music.position;
  const dur = music.duration || 0;

  const toggle = () => fetchNui('phone:spotify:toggle', {}, {});
  const next = () => fetchNui('phone:spotify:next', {}, {});
  const prev = () => fetchNui('phone:spotify:prev', {}, {});
  const commitSeek = (v) => { fetchNui('phone:spotify:seek', { position: v }, {}); setSeek(null); };
  const setVol = (v) => dispatch(saveSettingLive('volume', Math.max(0, Math.min(100, v))));

  const like = async () => {
    if (!current) return;
    const r = await fetchNui('phone:spotify:toggleLike', { track: current }, { ok: true, liked: !liked });
    if (r && r.ok) {
      // reflect immediately without a full reload
      const cur = library.liked || [];
      const nextLiked = r.liked ? [current, ...cur.filter((x) => String(x.id) !== String(current.id))]
        : cur.filter((x) => String(x.id) !== String(current.id));
      dispatch(setNowMeta({ library: { ...library, liked: nextLiked } }));
    }
  };

  const toggleNearby = async () => {
    const r = await fetchNui('phone:spotify:setNearby', { on: !nearby }, { ok: true, nearby: !nearby });
    if (r && r.ok) {
      dispatch(setNowMeta({ nearby: r.nearby }));
      dispatch(pushToast({ title: r.nearby ? t('spotify.nowSpeaker') : t('spotify.nowPrivate'), body: '' }));
    }
  };

  return (
    <div className="sp-now" style={{ background: `linear-gradient(180deg, ${colorFor(current?.title || music.title)} -20%, #0a0a0a 52%)` }}>
      <div className="sp-now__bar">
        <button className="sp-iconbtn" onClick={onClose}><ChevronDown /></button>
        <span className="sp-now__ctx">{t('spotify.nowPlaying')}</span>
        <button className="sp-iconbtn" onClick={onShare}><MoreIcon /></button>
      </div>

      <div className="sp-now__art" style={music.artwork ? undefined : { background: gradientFor(music.title) }}>
        {music.artwork ? <img src={music.artwork} alt="" /> : <NoteIcon size={70} />}
      </div>

      <div className="sp-now__head">
        <div className="sp-now__titles">
          <div className="sp-now__title">{music.title || t('spotify.nothingPlaying')}</div>
          <div className="sp-now__artist">{music.artist || '—'}</div>
        </div>
        <button className={`sp-heart${liked ? ' is-on' : ''}`} onClick={like} aria-label="Like"><HeartIcon size={24} filled={liked} /></button>
      </div>

      <div className="sp-now__seek">
        <input className="sp-range" type="range" min={0} max={Math.max(dur, 1)} step={1} value={Math.min(pos, dur || 1)}
          onChange={(e) => setSeek(Number(e.target.value))} onPointerUp={(e) => commitSeek(Number(e.target.value))} />
        <div className="sp-now__times"><span>{fmtTime(pos)}</span><span>{fmtTime(dur)}</span></div>
      </div>

      <div className="sp-now__controls">
        <button className="sp-ctl" onClick={prev} disabled={!hasPrev}><PrevIcon size={30} /></button>
        <button className="sp-ctl sp-ctl--play" onClick={toggle}>{music.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}</button>
        <button className="sp-ctl" onClick={next} disabled={!hasNext}><NextIcon size={30} /></button>
      </div>

      <div className="sp-now__foot">
        {allowNearby && (
          <button className={`sp-foot__btn${nearby ? ' is-on' : ''}`} onClick={toggleNearby}>
            {nearby ? <SpeakerIcon size={20} /> : <HeadphoneIcon size={20} />}
            <span>{nearby ? t('spotify.speaker') : t('spotify.private')}</span>
          </button>
        )}
        <div className="sp-vol">
          <VolumeIcon size={18} />
          <input className="sp-range sp-range--vol" type="range" min={0} max={100} step={1} value={volume} onChange={(e) => setVol(Number(e.target.value))} />
        </div>
        <button className="sp-foot__btn" onClick={onShare}><ShareIcon size={19} /><span>{t('spotify.share')}</span></button>
      </div>
    </div>
  );
}
