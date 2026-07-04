import PhotoThumb from './PhotoThumb';
import { useT } from '../../../i18n/useT';

export default function PhotoGrid({ items, selectMode, selected, onOpen, onToggleSelect }) {
  const t = useT();
  if (items.length === 0) {
    return (
      <div className="ph-empty">
        <div className="ph-empty__title">{t('photos.noPhotos')}</div>
        <div>{t('photos.noPhotosHint')}</div>
      </div>
    );
  }

  return (
    <div className="ph-grid">
      {items.map((p) => (
        <PhotoThumb
          key={p.id}
          photo={p}
          selectMode={selectMode}
          selected={selected.has(p.id)}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
