import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { loadLibrary } from '../../store/slices/spotifySlice';
import { pushToast } from '../../store/slices/toastSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { useT } from '../../i18n/useT';
import { useSpotify } from './ctx';
import { gradientFor } from './util';
import TrackRow from './TrackRow';
import { BackArrow, PlayIcon, HeartIcon, MoreIcon, EditIcon, TrashIcon } from './icons';

// A playlist (or the virtual 'liked' list). Play-all, plus rename/delete for
// real playlists.
export default function PlaylistView({ playlistId, onBack }) {
  const t = useT();
  const dispatch = useDispatch();
  const sp = useSpotify();
  const library = useSelector((s) => s.spotify.library);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(null);

  const isLiked = playlistId === 'liked';
  const pl = isLiked ? { id: 'liked', name: t('spotify.likedSongs'), tracks: library.liked || [] }
    : (library.playlists || []).find((p) => p.id === playlistId) || { id: playlistId, name: '', tracks: [] };
  const tracks = pl.tracks || [];

  const playAll = () => { if (tracks.length) sp.play(tracks[0], tracks, 1); };

  const doRename = async () => {
    const nm = (renaming || '').trim();
    if (!nm) return;
    await fetchNui('phone:spotify:renamePlaylist', { id: pl.id, name: nm }, { ok: true });
    setRenaming(null); dispatch(loadLibrary());
  };
  const doDelete = async () => {
    setMenu(false);
    const ok = await dispatch(openDialog({
      title: t('spotify.deletePlaylist'), message: t('spotify.deletePlaylistMsg', { name: pl.name }),
      buttons: [{ text: t('common.cancel'), style: 'cancel', value: false }, { text: t('common.delete'), style: 'destructive', value: true }],
    }));
    if (!ok) return;
    await fetchNui('phone:spotify:deletePlaylist', { id: pl.id }, { ok: true });
    dispatch(loadLibrary());
    dispatch(pushToast({ type: 'success', title: t('spotify.playlistDeleted'), body: '' }));
    onBack();
  };

  return (
    <div className="sp-screen sp-scroll">
      <div className="sp-plhero" style={{ background: isLiked ? 'linear-gradient(160deg,#4a1fb8,#0a0a0a 70%)' : gradientFor(pl.name) }}>
        <div className="sp-plhero__bar">
          <button className="sp-iconbtn" onClick={onBack}><BackArrow /></button>
          {!isLiked && <button className="sp-iconbtn" onClick={() => setMenu(true)}><MoreIcon /></button>}
        </div>
        <div className="sp-plhero__art" style={{ background: isLiked ? 'linear-gradient(135deg,#8b5cf6,#c026d3)' : gradientFor(pl.name) }}>
          <HeartIcon size={44} filled />
        </div>
        <h1 className="sp-plhero__name">{pl.name}</h1>
        <div className="sp-plhero__sub">{t('spotify.songCount', { count: tracks.length })}</div>
      </div>

      <div className="sp-plbar">
        <button className="sp-playfab" onClick={playAll} disabled={!tracks.length}><PlayIcon size={26} /></button>
      </div>

      <div className="sp-list">
        {tracks.length === 0 ? (
          <div className="sp-empty sp-empty--sm">{t('spotify.emptyPlaylist')}</div>
        ) : (
          tracks.map((tr, i) => <TrackRow key={tr.id} track={tr} queue={tracks} index={i + 1} playlistId={pl.id} />)
        )}
      </div>

      {menu && (
        <div className="sp-sheet" onClick={() => setMenu(false)}>
          <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
            <button className="sp-sheet__item" onClick={() => { setMenu(false); setRenaming(pl.name); }}><EditIcon size={19} /> {t('spotify.rename')}</button>
            <button className="sp-sheet__item sp-sheet__item--danger" onClick={doDelete}><TrashIcon size={19} /> {t('spotify.deletePlaylist')}</button>
            <button className="sp-sheet__btn" onClick={() => setMenu(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {renaming !== null && (
        <div className="sp-sheet" onClick={() => setRenaming(null)}>
          <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
            <div className="sp-sheet__title">{t('spotify.rename')}</div>
            <input className="sp-input" autoFocus maxLength={60} value={renaming} onChange={(e) => setRenaming(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
            <div className="sp-sheet__row">
              <button className="sp-sheet__btn" onClick={() => setRenaming(null)}>{t('common.cancel')}</button>
              <button className="sp-sheet__btn sp-sheet__btn--primary" disabled={!renaming.trim()} onClick={doRename}>{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
