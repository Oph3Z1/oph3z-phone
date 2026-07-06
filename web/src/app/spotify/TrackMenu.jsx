import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { loadLibrary } from '../../store/slices/spotifySlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { gradientFor } from './util';
import { HeartIcon, PlusIcon, ShareIcon, TrashIcon, NoteIcon } from './icons';

// The ⋯ menu for a track: like, add to a playlist, share, and (inside a playlist)
// remove. `playlistId` is set when opened from within a playlist.
export default function TrackMenu({ track, playlistId, onShare, onClose }) {
  const t = useT();
  const dispatch = useDispatch();
  const library = useSelector((s) => s.spotify.library);
  const [adding, setAdding] = useState(false);
  if (!track) return null;

  const liked = (library.liked || []).some((x) => String(x.id) === String(track.id));

  const like = async () => {
    await fetchNui('phone:spotify:toggleLike', { track }, { ok: true, liked: !liked });
    dispatch(loadLibrary());
    dispatch(pushToast({ title: liked ? t('spotify.removedFromLiked') : t('spotify.addedToLiked'), body: '' }));
    onClose();
  };
  const addTo = async (pid) => {
    const r = await fetchNui('phone:spotify:addTrack', { playlistId: pid, track }, { ok: true });
    dispatch(loadLibrary());
    dispatch(pushToast({ title: r && r.already ? t('spotify.alreadyAdded') : t('spotify.addedToPlaylist'), body: '' }));
    onClose();
  };
  const remove = async () => {
    await fetchNui('phone:spotify:removeTrack', { playlistId, trackId: track.id }, { ok: true });
    dispatch(loadLibrary());
    dispatch(pushToast({ title: t('spotify.removed'), body: '' }));
    onClose();
  };

  if (adding) {
    return (
      <div className="sp-sheet" onClick={onClose}>
        <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
          <div className="sp-sheet__title">{t('spotify.addToPlaylist')}</div>
          {(library.playlists || []).length === 0 ? (
            <div className="sp-empty sp-empty--sm">{t('spotify.noPlaylists')}</div>
          ) : (
            <div className="sp-sheet__scroll">
              {library.playlists.map((p) => (
                <button className="sp-sheet__item" key={p.id} onClick={() => addTo(p.id)}>
                  <span className="sp-mini-art" style={{ background: gradientFor(p.name) }}><NoteIcon size={14} /></span> {p.name}
                </button>
              ))}
            </div>
          )}
          <button className="sp-sheet__btn" onClick={() => setAdding(false)}>{t('common.cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-sheet" onClick={onClose}>
      <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sp-share__head">
          <span className="sp-share__art" style={track.artwork ? undefined : { background: gradientFor(track.title) }}>
            {track.artwork ? <img src={track.artwork} alt="" /> : <NoteIcon size={20} />}
          </span>
          <div className="sp-share__meta">
            <div className="sp-share__title">{track.title}</div>
            <div className="sp-share__artist">{track.artist || '—'}</div>
          </div>
        </div>
        <button className="sp-sheet__item" onClick={like}><HeartIcon size={19} filled={liked} /> {liked ? t('spotify.removeFromLiked') : t('spotify.addToLiked')}</button>
        <button className="sp-sheet__item" onClick={() => setAdding(true)}><PlusIcon size={19} /> {t('spotify.addToPlaylist')}</button>
        <button className="sp-sheet__item" onClick={() => { onClose(); onShare(track); }}><ShareIcon size={19} /> {t('spotify.share')}</button>
        {playlistId && playlistId !== 'liked' && (
          <button className="sp-sheet__item sp-sheet__item--danger" onClick={remove}><TrashIcon size={19} /> {t('spotify.removeFromPlaylist')}</button>
        )}
        <button className="sp-sheet__btn" onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
