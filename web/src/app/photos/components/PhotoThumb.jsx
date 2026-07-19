import { useState } from 'react';
import { CheckIcon } from './icons';
import { fmtDuration, readDuration } from './duration';

export default function PhotoThumb({ photo, selectMode, selected, onOpen, onToggleSelect }) {
    const [dur, setDur] = useState(photo.duration || null);

    const handleClick = () => {
        if (selectMode) onToggleSelect(photo.id);
        else onOpen(photo.id);
    };

    return (
        <button className={`ph-thumb${selected ? ' is-selected' : ''}`} onClick={handleClick}>
            {photo.type === 'video' ? (
                <video
                    className="ph-thumb__media"
                    src={photo.url}
                    muted
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                        if (!photo.duration) readDuration(e.target, setDur);
                    }}
                />
            ) : (
                <img className="ph-thumb__media" src={photo.thumb || photo.url} alt="" loading="lazy" />
            )}

            {photo.type === 'video' && <span className="ph-thumb__dur">{fmtDuration(dur)}</span>}

            {selectMode && (
                <span className={`ph-thumb__check${selected ? ' is-on' : ''}`}>
                    {selected && <CheckIcon />}
                </span>
            )}
        </button>
    );
}