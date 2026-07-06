import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { setSearch } from '../../store/slices/spotifySlice';
import { useT } from '../../i18n/useT';
import TrackRow from './TrackRow';
import { SearchIcon, CloseIcon, NoteIcon } from './icons';

// Search songs via the external API (routed through Lua). Results are kept in
// redux so switching tabs doesn't lose them.
export default function Search() {
  const t = useT();
  const dispatch = useDispatch();
  const { q, results, loading, done, reason } = useSelector((s) => s.spotify.search);

  useEffect(() => {
    const query = q.trim();
    if (!query) { dispatch(setSearch({ results: [], loading: false, done: false })); return undefined; }
    let alive = true;
    dispatch(setSearch({ loading: true }));
    const id = setTimeout(async () => {
      const res = await fetchNui('phone:spotify:search', { q: query }, { ok: true, tracks: [] });
      if (alive) dispatch(setSearch({ results: (res && res.tracks) || [], loading: false, done: true, reason: (res && res.reason) || null }));
    }, 350);
    return () => { alive = false; clearTimeout(id); };
  }, [q, dispatch]);

  return (
    <div className="sp-screen">
      <div className="sp-searchhead">
        <h1 className="sp-searchhead__title">{t('spotify.search')}</h1>
        <div className="sp-searchbar">
          <SearchIcon size={18} />
          <input autoFocus value={q} placeholder={t('spotify.searchPh')} onChange={(e) => dispatch(setSearch({ q: e.target.value }))} />
          {q ? <button onClick={() => dispatch(setSearch({ q: '', results: [], done: false }))}><CloseIcon size={16} /></button> : null}
        </div>
      </div>

      <div className="sp-scroll sp-scroll--list">
        {!q.trim() ? (
          <div className="sp-empty"><SearchIcon size={38} /><div className="sp-empty__title">{t('spotify.searchHint')}</div></div>
        ) : loading ? (
          <div className="sp-empty sp-empty--sm">{t('spotify.searching')}</div>
        ) : reason === 'nokey' ? (
          <div className="sp-empty"><NoteIcon size={34} /><div className="sp-empty__title">{t('spotify.noKeyTitle')}</div><div className="sp-empty__sub">{t('spotify.noKeySub')}</div></div>
        ) : results.length === 0 && done ? (
          <div className="sp-empty sp-empty--sm"><NoteIcon size={34} /><div>{t('spotify.noResults')}</div></div>
        ) : (
          results.map((tr, i) => <TrackRow key={tr.id} track={tr} queue={results} index={i + 1} />)
        )}
      </div>
    </div>
  );
}
