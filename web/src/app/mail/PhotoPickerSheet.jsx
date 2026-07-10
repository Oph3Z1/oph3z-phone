import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { loadPhotos } from '../../store/slices/photosSlice';

export default function PhotoPickerSheet({
    selected = [],
    onClose,
    onDone,
    single = false,
    photosOnly = false,
}) {
    const dispatch = useDispatch();
    const t = useT();
    const loaded = useSelector((s) => s.photos.loaded);
    const allMedia = useSelector((s) => s.photos.items);
    const media = photosOnly ? allMedia.filter((m) => m.type !== 'video') : allMedia;
    const [picked, setPicked] = useState(() => new Map(selected.map((a) => [a.url, a])));

    useEffect(() => {
        if (!loaded) dispatch(loadPhotos());
    }, [loaded, dispatch]);

    const pick = (p) => {
        if (single) {
            onDone([{ url: p.url, type: p.type, thumb: p.thumb }]);
            return;
        }
        toggle(p);
    };

    const toggle = (p) => {
        setPicked((prev) => {
            const next = new Map(prev);
            if (next.has(p.url)) next.delete(p.url);
            else if (next.size < 6) next.set(p.url, { url: p.url, type: p.type, thumb: p.thumb });
            return next;
        });
    };

    const done = () => onDone([...picked.values()]);

    return (
        <div className="mail-sheet" onClick={onClose}>
            <div className="mail-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <div className="mail-sheet__bar">
                    <button className="mail-sheet__cancel" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <span className="mail-sheet__title">{t('mail.attach')}</span>
                    {single ? (
                        <span className="mail-sheet__done" />
                    ) : (
                        <button className="mail-sheet__done" onClick={done}>
                            {t('common.done')}
                        </button>
                    )}
                </div>

                <div className="mail-sheet__scroll">
                    {media.length === 0 ? (
                        <div className="mail-sheet__empty">{t('mail.noMedia')}</div>
                    ) : (
                        <div className="mail-sheet__grid">
                            {media.map((p) => (
                                <button
                                    key={p.id}
                                    className={`mail-sheet__cell${picked.has(p.url) ? ' is-picked' : ''}`}
                                    onClick={() => pick(p)}
                                >
                                    {p.type === 'video' ? (
                                        <video
                                            className="mail-sheet__media"
                                            src={p.url}
                                            muted
                                            playsInline
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            className="mail-sheet__media"
                                            src={p.thumb || p.url}
                                            alt=""
                                        />
                                    )}
                                    {p.type === 'video' && (
                                        <span className="mail-sheet__vbadge" />
                                    )}
                                    {picked.has(p.url) && (
                                        <span className="mail-sheet__check" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}