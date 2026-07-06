import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { loadLibrary } from '../../store/slices/spotifySlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { gradientFor } from './util';
import { HeartIcon, PlusIcon, NoteIcon } from './icons';

// Your Library: Liked Songs + player-made playlists, with a create sheet.
export default function Library({ onOpenPlaylist }) {
  const t = useT();
  const dispatch = useDispatch();
  const library = useSelector((s) => s.spotify.library);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = async () => {
    const nm = name.trim();
    if (!nm) return;
    const res = await fetchNui('phone:spotify:createPlaylist', { name: nm }, { ok: true, playlist: { id: 'pl1', name: nm, tracks: [] } });
    setCreating(false); setName('');
    if (res && res.ok) { dispatch(loadLibrary()); dispatch(pushToast({ type: 'success', title: t('spotify.playlistCreated'), body: '' })); }
  };

  return (
    <div className="sp-screen sp-scroll">
      <div className="sp-libhead">
        <h1 className="sp-libhead__title">{t('spotify.yourLibrary')}</h1>
        <button className="sp-iconbtn" onClick={() => setCreating(true)} aria-label={t('spotify.newPlaylist')}><PlusIcon size={22} /></button>
      </div>

      {/* Liked Songs */}
      <button className="sp-liked" onClick={() => onOpenPlaylist({ id: 'liked' })}>
        <span className="sp-liked__art"><HeartIcon size={26} filled /></span>
        <div className="sp-liked__meta">
          <div className="sp-liked__title">{t('spotify.likedSongs')}</div>
          <div className="sp-liked__sub">{t('spotify.songCount', { count: (library.liked || []).length })}</div>
        </div>
      </button>

      {/* Playlists */}
      {(library.playlists || []).length === 0 ? (
        <div className="sp-empty">
          <NoteIcon size={40} />
          <div className="sp-empty__title">{t('spotify.noPlaylists')}</div>
          <div className="sp-empty__sub">{t('spotify.noPlaylistsSub')}</div>
        </div>
      ) : (
        <div className="sp-pllist">
          {library.playlists.map((p) => (
            <button className="sp-plrow" key={p.id} onClick={() => onOpenPlaylist(p)}>
              <span className="sp-plrow__art" style={{ background: gradientFor(p.name) }}><NoteIcon size={20} /></span>
              <div className="sp-plrow__meta">
                <div className="sp-plrow__name">{p.name}</div>
                <div className="sp-plrow__sub">{t('spotify.songCount', { count: (p.tracks || []).length })}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="sp-sheet" onClick={() => setCreating(false)}>
          <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
            <div className="sp-sheet__title">{t('spotify.newPlaylist')}</div>
            <input className="sp-input" autoFocus maxLength={60} placeholder={t('spotify.playlistNamePh')}
              value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
            <div className="sp-sheet__row">
              <button className="sp-sheet__btn" onClick={() => setCreating(false)}>{t('common.cancel')}</button>
              <button className="sp-sheet__btn sp-sheet__btn--primary" disabled={!name.trim()} onClick={create}>{t('spotify.create')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
