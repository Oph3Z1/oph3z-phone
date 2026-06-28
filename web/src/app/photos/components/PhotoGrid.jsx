import PhotoThumb from './PhotoThumb';

export default function PhotoGrid({ items, selectMode, selected, onOpen, onToggleSelect }) {
  if (items.length === 0) {
    return (
      <div className="ph-empty">
        <div className="ph-empty__title">No Photos</div>
        <div>Photos and videos you take will appear here.</div>
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
