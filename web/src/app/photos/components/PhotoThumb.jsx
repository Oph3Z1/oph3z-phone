import { PlayIcon, CheckIcon } from './icons';

// A single square thumbnail in the grid.
export default function PhotoThumb({ photo, selectMode, selected, onOpen, onToggleSelect }) {
  const handleClick = () => {
    if (selectMode) onToggleSelect(photo.id);
    else onOpen(photo.id);
  };

  return (
    <button
      className={`ph-thumb${selected ? ' is-selected' : ''}`}
      onClick={handleClick}
    >
      {photo.type === 'video' ? (
        <video className="ph-thumb__media" src={photo.url} muted preload="metadata" />
      ) : (
        <img className="ph-thumb__media" src={photo.thumb || photo.url} alt="" />
      )}

      {photo.type === 'video' && (
        <span className="ph-thumb__video">
          <PlayIcon />
        </span>
      )}

      {selectMode && (
        <span className={`ph-thumb__check${selected ? ' is-on' : ''}`}>
          {selected && <CheckIcon />}
        </span>
      )}
    </button>
  );
}
