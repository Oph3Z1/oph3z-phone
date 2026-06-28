import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ChevronLeftIcon, HeartIcon, HeartFillIcon, TrashIcon } from './icons';
import { togglePhotoFavorite, deletePhotos, setLightbox } from '../../../store/slices/photosSlice';

const SWIPE = 50; // px to move between items

// Fullscreen photo/video viewer with swipe navigation.
export default function PhotoViewer({ items, startId, onClose }) {
  const dispatch = useDispatch();
  const [index, setIndex] = useState(() => Math.max(0, items.findIndex((p) => p.id === startId)));
  const startX = useRef(null);

  // Keep the index valid as items change (e.g. after a delete).
  useEffect(() => {
    if (items.length === 0) onClose();
    else if (index > items.length - 1) setIndex(items.length - 1);
  }, [items, index, onClose]);

  const photo = items[index];
  if (!photo) return null;

  const go = (dir) => {
    setIndex((i) => Math.min(items.length - 1, Math.max(0, i + dir)));
  };

  const onPointerDown = (e) => (startX.current = e.clientX);
  const onPointerUp = (e) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx > SWIPE) go(-1);
    else if (dx < -SWIPE) go(1);
  };

  const remove = () => dispatch(deletePhotos([photo.id]));

  return (
    <div className="ph-viewer" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className="ph-viewer__bar">
        <button className="ph-viewer__btn" onClick={onClose}>
          <ChevronLeftIcon />
        </button>
        <span className="ph-viewer__count">
          {index + 1} of {items.length}
        </span>
        <button
          className="ph-viewer__btn ph-viewer__btn--danger"
          onClick={remove}
          aria-label="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="ph-viewer__stage">
        {photo.type === 'video' ? (
          <video className="ph-viewer__media" src={photo.url} controls autoPlay />
        ) : (
          <img
            className="ph-viewer__media ph-viewer__media--zoom"
            src={photo.url}
            alt=""
            onClick={() => dispatch(setLightbox(photo.url))}
          />
        )}
      </div>

      <div className="ph-viewer__actions">
        <button
          className={`ph-viewer__fav${photo.favorite ? ' is-on' : ''}`}
          onClick={() => dispatch(togglePhotoFavorite(photo.id, !photo.favorite))}
          aria-label="Favorite"
        >
          {photo.favorite ? <HeartFillIcon /> : <HeartIcon />}
        </button>
      </div>
    </div>
  );
}
