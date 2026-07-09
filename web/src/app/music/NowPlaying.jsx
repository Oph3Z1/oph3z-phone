import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { saveSettingLive } from '../../store/slices/settingsSlice';
import { setNowMeta, loadLibrary } from '../../store/slices/spotifySlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { fmtTime, gradientFor } from './util';
import {
    ChevronDown,
    ShareIcon,
    PlayIcon,
    PauseIcon,
    NextIcon,
    PrevIcon,
    HeartIcon,
    PlusIcon,
    SpeakerIcon,
    HeadphoneIcon,
    VolumeIcon,
    NoteIcon,
} from './icons';

export default function NowPlaying({ onClose, onShare }) {
    const t = useT();
    const dispatch = useDispatch();
    const music = useSelector((s) => s.music);
    const { current, nearby, allowNearby, hasNext, hasPrev, library } = useSelector(
        (s) => s.spotify,
    );
    const volume = useSelector((s) => s.settings.volume);
    const [seek, setSeek] = useState(null);
    const [adding, setAdding] = useState(false);

    const liked =
        current && (library.liked || []).some((tk) => String(tk.id) === String(current.id));
    const pos = seek != null ? seek : music.position;
    const dur = music.duration || 0;
    const art = music.artwork;

    const toggle = () => fetchNui('phone:spotify:toggle', {}, {});
    const next = () => fetchNui('phone:spotify:next', {}, {});
    const prev = () => fetchNui('phone:spotify:prev', {}, {});
    const commitSeek = (v) => {
        fetchNui('phone:spotify:seek', { position: v }, {});
        setSeek(null);
    };
    const setVol = (v) => dispatch(saveSettingLive('volume', Math.max(0, Math.min(100, v))));

    const like = async () => {
        if (!current) return;
        const r = await fetchNui(
            'phone:spotify:toggleLike',
            { track: current },
            { ok: true, liked: !liked },
        );
        if (r && r.ok) {
            const cur = library.liked || [];
            const nextLiked = r.liked
                ? [current, ...cur.filter((x) => String(x.id) !== String(current.id))]
                : cur.filter((x) => String(x.id) !== String(current.id));
            dispatch(setNowMeta({ library: { ...library, liked: nextLiked } }));
        }
    };
    const addTo = async (pid) => {
        if (!current) return;
        const r = await fetchNui(
            'phone:spotify:addTrack',
            { playlistId: pid, track: current },
            { ok: true },
        );
        dispatch(loadLibrary());
        dispatch(
            pushToast({
                title: r && r.already ? t('spotify.alreadyAdded') : t('spotify.addedToPlaylist'),
                body: '',
            }),
        );
        setAdding(false);
    };
    const toggleNearby = async () => {
        const r = await fetchNui(
            'phone:spotify:setNearby',
            { on: !nearby },
            { ok: true, nearby: !nearby },
        );
        if (r && r.ok) {
            dispatch(setNowMeta({ nearby: r.nearby }));
            dispatch(
                pushToast({
                    title: r.nearby ? t('spotify.nowSpeaker') : t('spotify.nowPrivate'),
                    body: '',
                }),
            );
        }
    };

    return (
        <div className="sp-now">
            <div
                className="sp-now__bg"
                style={
                    art
                        ? { backgroundImage: `url(${art})` }
                        : { background: gradientFor(music.title) }
                }
            />
            <div className="sp-now__scrim" />

            <div className="sp-now__bar">
                <button className="sp-round sp-round--dark" onClick={onClose}>
                    <ChevronDown size={22} />
                </button>
                <span className="sp-now__ctx">{t('spotify.nowPlaying')}</span>
                <button className="sp-round sp-round--dark" onClick={onShare}>
                    <ShareIcon size={19} />
                </button>
            </div>

            <div
                className={`sp-now__cover${music.playing ? ' is-playing' : ''}`}
                style={
                    art
                        ? { backgroundImage: `url(${art})` }
                        : { background: gradientFor(music.title) }
                }
            >
                {!art && <NoteIcon size={70} />}
            </div>

            <div className="sp-now__panel">
                <div className="sp-now__head">
                    <div className="sp-now__titles">
                        <div className="sp-now__title">
                            {music.title || t('spotify.nothingPlaying')}
                        </div>
                        <div className="sp-now__artist">{music.artist || '—'}</div>
                    </div>
                    <button
                        className="sp-heart"
                        onClick={() => setAdding(true)}
                        disabled={!current}
                        aria-label={t('spotify.addToPlaylist')}
                    >
                        <PlusIcon size={24} />
                    </button>
                    <button
                        className={`sp-heart${liked ? ' is-on' : ''}`}
                        onClick={like}
                        aria-label="Like"
                    >
                        <HeartIcon size={24} filled={liked} />
                    </button>
                </div>

                <div className="sp-now__seek">
                    <input
                        className="sp-range"
                        type="range"
                        min={0}
                        max={Math.max(dur, 1)}
                        step={1}
                        value={Math.min(pos, dur || 1)}
                        onChange={(e) => setSeek(Number(e.target.value))}
                        onPointerUp={(e) => commitSeek(Number(e.target.value))}
                    />
                    <div className="sp-now__times">
                        <span>{fmtTime(pos)}</span>
                        <span>{fmtTime(dur)}</span>
                    </div>
                </div>

                <div className="sp-now__ctl">
                    <button className="sp-ctl" onClick={prev} disabled={!hasPrev}>
                        <PrevIcon size={30} />
                    </button>
                    <button className="sp-ctl sp-ctl--play" onClick={toggle}>
                        {music.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
                    </button>
                    <button className="sp-ctl" onClick={next} disabled={!hasNext}>
                        <NextIcon size={30} />
                    </button>
                </div>

                <div className="sp-now__foot">
                    {allowNearby ? (
                        <button
                            className={`sp-chip${nearby ? ' is-on' : ''}`}
                            onClick={toggleNearby}
                        >
                            {nearby ? <SpeakerIcon size={18} /> : <HeadphoneIcon size={18} />}
                            <span>{nearby ? t('spotify.speaker') : t('spotify.private')}</span>
                        </button>
                    ) : (
                        <span />
                    )}
                    <div className="sp-vol">
                        <VolumeIcon size={18} />
                        <input
                            className="sp-range sp-range--vol"
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={volume}
                            onChange={(e) => setVol(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {adding && (
                <div className="sp-sheet" onClick={() => setAdding(false)}>
                    <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="sp-sheet__griphit"
                            onClick={() => setAdding(false)}
                            aria-label={t('common.close')}
                        >
                            <span className="sp-sheet__grip" />
                        </button>
                        <div className="sp-sheet__title">{t('spotify.addToPlaylist')}</div>
                        {(library.playlists || []).length === 0 ? (
                            <div className="sp-empty sp-empty--sm">{t('spotify.noPlaylists')}</div>
                        ) : (
                            <div className="sp-sheet__scroll">
                                {library.playlists.map((p) => {
                                    const cover = (p.tracks || []).find((tk) => tk.artwork);
                                    return (
                                        <button
                                            className="sp-item"
                                            key={p.id}
                                            onClick={() => addTo(p.id)}
                                        >
                                            <span
                                                className="sp-item__art"
                                                style={
                                                    cover
                                                        ? {
                                                              backgroundImage: `url(${cover.artwork})`,
                                                          }
                                                        : { background: gradientFor(p.name) }
                                                }
                                            >
                                                {!cover && <NoteIcon size={13} />}
                                            </span>{' '}
                                            {p.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}