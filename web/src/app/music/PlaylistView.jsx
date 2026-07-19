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
import { BackArrow, PlayIcon, HeartIcon, MoreIcon, EditIcon, TrashIcon, NoteIcon } from './icons';

export default function PlaylistView({ playlistId, onBack }) {
    const t = useT();
    const dispatch = useDispatch();
    const sp = useSpotify();
    const library = useSelector((s) => s.spotify.library);
    const [menu, setMenu] = useState(false);
    const [renaming, setRenaming] = useState(null);

    const isLiked = playlistId === 'liked';
    const pl = isLiked
        ? { id: 'liked', name: t('spotify.likedSongs'), tracks: library.liked || [] }
        : (library.playlists || []).find((p) => p.id === playlistId) || {
              id: playlistId,
              name: '',
              tracks: [],
          };
    const tracks = pl.tracks || [];
    const cover = tracks.find((tk) => tk.artwork);

    const playAll = () => {
        if (tracks.length) sp.play(tracks[0], tracks, 1);
    };

    const doRename = async () => {
        const nm = (renaming || '').trim();
        if (!nm) return;
        await fetchNui('phone:spotify:renamePlaylist', { id: pl.id, name: nm }, { ok: true });
        setRenaming(null);
        dispatch(loadLibrary());
    };
    const doDelete = async () => {
        setMenu(false);
        const ok = await dispatch(
            openDialog({
                title: t('spotify.deletePlaylist'),
                message: t('spotify.deletePlaylistMsg', { name: pl.name }),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('common.delete'), style: 'destructive', value: true },
                ],
            }),
        );
        if (!ok) return;
        await fetchNui('phone:spotify:deletePlaylist', { id: pl.id }, { ok: true });
        dispatch(loadLibrary());
        dispatch(pushToast({ type: 'success', title: t('spotify.playlistDeleted'), body: '' }));
        onBack();
    };

    return (
        <div className={`sp-screen sp-pl${isLiked ? ' sp-pl--liked' : ''}`}>
            <div className="sp-pl__hero">
                <div
                    className="sp-pl__bg"
                    style={
                        isLiked
                            ? {
                                  background:
                                      'radial-gradient(115% 78% at 50% 12%, #fb2c48 0%, #6a1120 44%, #050505 78%)',
                              }
                            : cover
                              ? { backgroundImage: `url(${cover.artwork})` }
                              : { background: gradientFor(pl.name) }
                    }
                />
                <div className="sp-pl__bgscrim" />
                <div className="sp-pl__bar">
                    <button className="sp-round sp-round--dark" onClick={onBack}>
                        <BackArrow size={20} />
                    </button>
                    {!isLiked && (
                        <button className="sp-round sp-round--dark" onClick={() => setMenu(true)}>
                            <MoreIcon size={20} />
                        </button>
                    )}
                </div>
                <div
                    className="sp-pl__cover"
                    style={
                        isLiked
                            ? { background: 'linear-gradient(135deg,#ff5c6e,#c81f39)' }
                            : cover
                              ? { backgroundImage: `url(${cover.artwork})` }
                              : { background: gradientFor(pl.name) }
                    }
                >
                    {isLiked ? <HeartIcon size={46} filled /> : !cover && <NoteIcon size={40} />}
                </div>
                <h1 className="sp-pl__name">{pl.name}</h1>
                <div className="sp-pl__count">
                    {t('spotify.songCount', { count: tracks.length })}
                </div>
                <button className="sp-pl__play" onClick={playAll} disabled={!tracks.length}>
                    <PlayIcon size={26} />
                </button>
            </div>

            <div className="sp-list sp-list--pl">
                {tracks.length === 0 ? (
                    <div className="sp-empty sp-empty--center">
                        <NoteIcon size={34} />
                        <div className="sp-empty__sub">{t('spotify.emptyPlaylist')}</div>
                    </div>
                ) : (
                    tracks.map((tr, i) => (
                        <TrackRow
                            key={tr.id}
                            track={tr}
                            queue={tracks}
                            index={i + 1}
                            playlistId={pl.id}
                            animateIn
                        />
                    ))
                )}
            </div>

            {menu && (
                <div className="sp-sheet" onClick={() => setMenu(false)}>
                    <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="sp-sheet__griphit"
                            onClick={() => setMenu(false)}
                            aria-label={t('common.close')}
                        >
                            <span className="sp-sheet__grip" />
                        </button>
                        <button
                            className="sp-item"
                            onClick={() => {
                                setMenu(false);
                                setRenaming(pl.name);
                            }}
                        >
                            <EditIcon size={19} /> {t('spotify.rename')}
                        </button>
                        <button className="sp-item sp-item--danger" onClick={doDelete}>
                            <TrashIcon size={19} /> {t('spotify.deletePlaylist')}
                        </button>
                    </div>
                </div>
            )}

            {renaming !== null && (
                <div className="sp-sheet" onClick={() => setRenaming(null)}>
                    <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="sp-sheet__griphit"
                            onClick={() => setRenaming(null)}
                            aria-label={t('common.close')}
                        >
                            <span className="sp-sheet__grip" />
                        </button>
                        <div className="sp-sheet__title">{t('spotify.rename')}</div>
                        <input
                            className="sp-input"
                            ref={(el) => {
                                if (el && document.activeElement !== el)
                                    el.focus({ preventScroll: true });
                            }}
                            maxLength={60}
                            value={renaming}
                            onChange={(e) => setRenaming(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && doRename()}
                        />
                        <div className="sp-sheet__row">
                            <button
                                className="sp-btn sp-btn--ghost"
                                onClick={() => setRenaming(null)}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                className="sp-btn sp-btn--green"
                                disabled={!renaming.trim()}
                                onClick={doRename}
                            >
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}