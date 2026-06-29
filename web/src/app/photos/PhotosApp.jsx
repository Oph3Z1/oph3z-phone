import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './PhotosApp.css';

import { loadPhotos, deletePhotos, togglePhotoFavorite } from '../../store/slices/photosSlice';
import PhotoGrid from './components/PhotoGrid';
import PhotoViewer from './components/PhotoViewer';
import PhotosNav from './components/PhotosNav';
import { HeartIcon, TrashIcon } from './components/icons';

// Date label used for the search filter (photos have no text to search).
function dateLabel(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PhotosApp() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.photos.items);

  const [tab, setTab] = useState('library'); // 'library' | 'favorites'
  const [search, setSearch] = useState({ open: false, query: '' });
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [viewerId, setViewerId] = useState(null);

  const scrollRef = useRef(null);
  const didInitScroll = useRef(false);

  // Always refresh when the app opens so new photos (command / DB / camera) show up.
  useEffect(() => {
    dispatch(loadPhotos());
  }, [dispatch]);

  // Chronological order: oldest first, newest LAST (like the iPhone grid).
  const list = useMemo(() => {
    let arr = [...items].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (tab === 'favorites') arr = arr.filter((p) => p.favorite);
    const q = search.query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (p) => dateLabel(p.ts).toLowerCase().includes(q) || p.type.includes(q)
      );
    }
    return arr;
  }, [items, tab, search.query]);

  // Start at the newest (bottom) once the photos first load, like iPhone.
  useEffect(() => {
    if (!didInitScroll.current && list.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      didInitScroll.current = true;
    }
  }, [list]);

  const title = tab === 'favorites' ? 'Favorites' : 'Library';

  // --- selection ---
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

  return (
    <div className="photos">
      <div className="photos__header">
        <div className="photos__titles">
          <div className="photos__title">{title}</div>
          <div className="photos__count">{list.length} items</div>
        </div>
        {(list.length > 0 || selectMode) && (
          <button
            className="photos__select"
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      <div className="photos__scroll" ref={scrollRef}>
        <PhotoGrid
          items={list}
          selectMode={selectMode}
          selected={selected}
          onOpen={setViewerId}
          onToggleSelect={toggleSelect}
        />
      </div>

      {selectMode ? (
        <div className="photos__selectbar">
          <button onClick={favSelected} disabled={!selected.size}>
            <HeartIcon /> Favorite
          </button>
          <span className="photos__selectcount">
            {selected.size ? `${selected.size} selected` : 'Select items'}
          </span>
          <button
            className="photos__selectbar-danger"
            onClick={removeSelected}
            disabled={!selected.size}
          >
            <TrashIcon /> Delete
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
