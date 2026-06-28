import { useEffect, useRef } from 'react';
import { SearchIcon } from './icons';

// iOS-18 style floating glass nav: [Library | Favorites] + a search button that
// expands the whole bar into a search field.
export default function PhotosNav({ tab, setTab, search, setSearch }) {
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
            placeholder="Search"
            value={search.query}
            onChange={(e) => setSearch({ open: true, query: e.target.value })}
          />
        </div>
        <button
          className="ph-nav__cancel"
          onClick={() => setSearch({ open: false, query: '' })}
        >
          Cancel
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
          Library
        </button>
        <button
          className={tab === 'favorites' ? 'is-active' : ''}
          onClick={() => setTab('favorites')}
        >
          Favorites
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
