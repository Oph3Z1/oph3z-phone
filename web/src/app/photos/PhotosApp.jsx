import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './PhotosApp.css';

import { loadPhotos, deletePhotos, togglePhotoFavorite } from '../../store/slices/photosSlice';
import { openShare } from '../../store/slices/airdropSlice';
import PhotoGrid from './components/PhotoGrid';
import PhotoViewer from './components/PhotoViewer';
import PhotosNav from './components/PhotosNav';
import { HeartIcon, TrashIcon } from './components/icons';
import { useT } from '../../i18n/useT';
import { monthName } from '../../i18n/dateNames';

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

function dateLabel(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return `${monthName(d.getMonth(), true)} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function PhotosApp() {
    const dispatch = useDispatch();
    const t = useT();
    const items = useSelector((s) => s.photos.items);

    const [tab, setTab] = useState('library');
    const [search, setSearch] = useState({ open: false, query: '' });
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState(() => new Set());
    const [viewerId, setViewerId] = useState(null);

    const scrollRef = useRef(null);
    const didInitScroll = useRef(false);

    useEffect(() => {
        dispatch(loadPhotos());
    }, [dispatch]);

    const list = useMemo(() => {
        let arr = [...items].sort((a, b) => (a.ts || 0) - (b.ts || 0));
        if (tab === 'favorites') arr = arr.filter((p) => p.favorite);
        const q = search.query.trim().toLowerCase();
        if (q) {
            arr = arr.filter(
                (p) => dateLabel(p.ts).toLowerCase().includes(q) || p.type.includes(q),
            );
        }
        return arr;
    }, [items, tab, search.query]);

    useEffect(() => {
        if (!didInitScroll.current && list.length > 0 && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            didInitScroll.current = true;
        }
    }, [list]);

    const title = tab === 'favorites' ? t('photos.favorites') : t('photos.library');

    const toggleSelect = (id) =>
        setSelected((prev) => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    const exitSelect = () => {
        setSelectMode(false);
        setSelected(new Set());
    };
    const removeSelected = () => {
        if (selected.size) dispatch(deletePhotos([...selected]));
        exitSelect();
    };
    const favSelected = () => {
        selected.forEach((id) => dispatch(togglePhotoFavorite(id, true)));
        exitSelect();
    };
    const shareSelected = () => {
        if (!selected.size) return;
        const photos = list
            .filter((p) => selected.has(p.id))
            .map((p) => ({ url: p.url, type: p.type, thumb: p.thumb }));
        dispatch(openShare({ kind: 'photos', photos }));
        exitSelect();
    };

    return (
        <div className="photos">
            <div className="photos__header">
                <div className="photos__titles">
                    <div className="photos__title">{title}</div>
                    <div className="photos__count">
                        {t('photos.itemsCount', { n: list.length })}
                    </div>
                </div>
                {(list.length > 0 || selectMode) && (
                    <button
                        className="photos__select"
                        onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                    >
                        {selectMode ? t('photos.cancel') : t('photos.select')}
                    </button>
                )}
            </div>

            <div className="photos__scroll" ref={scrollRef}>
                <PhotoGrid
                    key={tab}
                    items={list}
                    selectMode={selectMode}
                    selected={selected}
                    onOpen={setViewerId}
                    onToggleSelect={toggleSelect}
                />
            </div>

            {selectMode ? (
                <div className="photos__selectbar">
                    <button onClick={shareSelected} disabled={!selected.size}>
                        <ShareIcon /> {t('phone.share')}
                    </button>
                    <button onClick={favSelected} disabled={!selected.size}>
                        <HeartIcon /> {t('photos.favorite')}
                    </button>
                    <button
                        className="photos__selectbar-danger"
                        onClick={removeSelected}
                        disabled={!selected.size}
                    >
                        <TrashIcon /> {t('photos.delete')}
                    </button>
                </div>
            ) : (
                <PhotosNav tab={tab} setTab={setTab} search={search} setSearch={setSearch} />
            )}

            {viewerId != null && (
                <PhotoViewer items={list} startId={viewerId} onClose={() => setViewerId(null)} />
            )}
        </div>
    );
}