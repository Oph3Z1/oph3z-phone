import { useEffect, useRef } from 'react';
import { SearchIcon } from './icons';
import { useT } from '../../../i18n/useT';

// iOS-18 style floating glass nav: [Library | Favorites] + a search button that
// expands the whole bar into a search field.
export default function PhotosNav({ tab, setTab, search, setSearch }) {
  const t = useT();
  const inputRef = useRef(null);

  useEffect(() => {
    if (search.open) inputRef.current?.focus();
  }, [search.open]);

  if (search.open) {
    return (
      <div className="ph-nav ph-nav--search">
        <div className="ph-nav__searchbox">
          <SearchIcon />
          <input
            ref={inputRef}
            placeholder={t('photos.search')}
            value={search.query}
            onChange={(e) => setSearch({ open: true, query: e.target.value })}
          />
        </div>
        <button
          className="ph-nav__cancel"
          onClick={() => setSearch({ open: false, query: '' })}
        >
          {t('photos.cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="ph-nav">
      <div className="ph-nav__segment">
        <button
          className={tab === 'library' ? 'is-active' : ''}
          onClick={() => setTab('library')}
        >
          {t('photos.library')}
        </button>
        <button
          className={tab === 'favorites' ? 'is-active' : ''}
          onClick={() => setTab('favorites')}
        >
          {t('photos.favorites')}
        </button>
      </div>
      <button
        className="ph-nav__search"
        onClick={() => setSearch({ open: true, query: '' })}
        aria-label="Search"
      >
        <SearchIcon />
      </button>
    </div>
  );
}
