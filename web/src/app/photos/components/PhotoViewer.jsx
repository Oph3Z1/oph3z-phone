import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon, HeartFillIcon, TrashIcon } from './icons';
import { togglePhotoFavorite, deletePhotos, setLightbox } from '../../../store/slices/photosSlice';
import { openShare } from '../../../store/slices/airdropSlice';
import VideoPlayer from './VideoPlayer';
import { monthName } from '../../../i18n/dateNames';

const ShareIcon = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M12 3v13M12 3L8.5 6.5M12 3l3.5 3.5" />
        <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
    </svg>
);

const SWIPE = 50;

function dateLine(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return `${monthName(d.getMonth())} ${String(d.getDate()).padStart(2, '0')}`;
}
function timeLine(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export default function PhotoViewer({ items, startId, onClose }) {
    const dispatch = useDispatch();
    const [index, setIndex] = useState(() =>
        Math.max(
            0,
            items.findIndex((p) => p.id === startId),
        ),
    );
    const startX = useRef(null);
    const activeFrame = useRef(null);

    useEffect(() => {
        if (items.length === 0) onClose();
        else if (index > items.length - 1) setIndex(items.length - 1);
    }, [items, index, onClose]);

    useEffect(() => {
        if (activeFrame.current) {
            activeFrame.current.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }, [index]);

    const photo = items[index];
    if (!photo) return null;

    const go = (dir) => setIndex((i) => Math.min(items.length - 1, Math.max(0, i + dir)));

    const onPointerDown = (e) => (startX.current = e.clientX);
    const onPointerUp = (e) => {
        if (startX.current == null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (dx > SWIPE) go(-1);
        else if (dx < -SWIPE) go(1);
    };

    const remove = () => dispatch(deletePhotos([photo.id]));
    const share = () =>
        dispatch(
            openShare({
                kind: 'photos',
                photos: [{ url: photo.url, type: photo.type, thumb: photo.thumb }],
            }),
        );

    return (
        <div className="ph-viewer">
            <div className="ph-viewer__bar">
                <button className="ph-viewer__btn" onClick={onClose} aria-label="Back">
                    <ChevronLeftIcon />
                </button>
                <div className="ph-viewer__when">
                    <div className="ph-viewer__date">{dateLine(photo.ts)}</div>
                    <div className="ph-viewer__time">{timeLine(photo.ts)}</div>
                </div>
                <div className="ph-viewer__btn ph-viewer__spacer" />
            </div>

            <div
                className="ph-viewer__stage"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                {photo.type === 'video' ? (
                    <VideoPlayer key={photo.id} src={photo.url} />
                ) : (
                    <img
                        className="ph-viewer__media ph-viewer__media--zoom"
                        src={photo.url}
                        alt=""
                        onClick={() => dispatch(setLightbox(photo.url))}
                    />
                )}

                {index > 0 && (
                    <button
                        className="ph-viewer__nav ph-viewer__nav--prev"
                        onClick={() => go(-1)}
                        aria-label="Previous"
                    >
                        <ChevronLeftIcon />
                    </button>
                )}
                {index < items.length - 1 && (
                    <button
                        className="ph-viewer__nav ph-viewer__nav--next"
                        onClick={() => go(1)}
                        aria-label="Next"
                    >
                        <ChevronRightIcon />
                    </button>
                )}
            </div>

            <div className="ph-viewer__strip">
                {items.map((p, i) => (
                    <button
                        key={p.id}
                        ref={i === index ? activeFrame : null}
                        className={`ph-viewer__frame${i === index ? ' is-active' : ''}`}
                        onClick={() => setIndex(i)}
                        aria-label="Open item"
                    >
                        {p.type === 'video' ? (
                            <video src={p.url} muted preload="metadata" />
                        ) : (
                            <img src={p.thumb || p.url} alt="" />
                        )}
                    </button>
                ))}
            </div>

            <div className="ph-viewer__actions">
                <button className="ph-viewer__act" onClick={share} aria-label="Share">
                    <ShareIcon />
                </button>
                <button
                    className={`ph-viewer__act${photo.favorite ? ' is-fav' : ''}`}
                    onClick={() => dispatch(togglePhotoFavorite(photo.id, !photo.favorite))}
                    aria-label="Favorite"
                >
                    {photo.favorite ? <HeartFillIcon /> : <HeartIcon />}
                </button>
                <button
                    className="ph-viewer__act ph-viewer__act--danger"
                    onClick={remove}
                    aria-label="Delete"
                >
                    <TrashIcon />
                </button>
            </div>
        </div>
    );
}