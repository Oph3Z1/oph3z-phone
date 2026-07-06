import { useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import { fmtCount } from './xUtil';
import Avatar from './Avatar';
import { BackArrow, SearchIcon, Verified } from './icons';

// Search profiles + trending Topics (shown when the query is empty).
export default function SearchScreen({ onBack }) {
  const t = useT();
  const nav = useXNav();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [topics, setTopics] = useState([]);
  const reqId = useRef(0);

  useEffect(() => {
    fetchNui('phone:x:topics', {}, { ok: true, topics: [] }).then((r) => r && r.ok && setTopics(r.topics || []));
  }, []);

  useEffect(() => {
    const my = ++reqId.current;
    const query = q.trim();
    if (!query) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await fetchNui('phone:x:search', { q: query }, { ok: true, accounts: [] });
      if (my === reqId.current && r && r.ok) setResults(r.accounts || []);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="x-screen x-search">
      <div className="x-topbar">
        <button className="x-iconbtn" onClick={onBack}><BackArrow /></button>
        <div className="x-search__bar">
          <SearchIcon size={18} />
          <input autoFocus value={q} placeholder={t('x.searchProfiles')} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="x-scroll">
        {q.trim() ? (
          results.length === 0 ? (
            <div className="x-empty x-empty--sm">{t('x.noResults')}</div>
          ) : (
            results.map((a) => (
              <button key={a.id} className="x-userrow" onClick={() => nav.openProfile({ id: a.id, handle: a.handle })}>
                <Avatar account={a} size="2.7em" />
                <div className="x-userrow__mid">
                  <span className="x-userrow__name">{a.name}<Verified tier={a.badge} /></span>
                  <span className="x-userrow__handle">@{a.handle}</span>
                  {a.bio ? <span className="x-userrow__bio">{a.bio}</span> : null}
                </div>
              </button>
            ))
          )
        ) : (
          <>
            <div className="x-section">{t('x.topics')}</div>
            {topics.length === 0 ? (
              <div className="x-empty x-empty--sm">{t('x.noTopics')}</div>
            ) : (
              topics.map((tp) => (
                <button key={tp.tag} className="x-topicrow" onClick={() => nav.openHashtag(tp.tag)}>
                  <span className="x-topicrow__tag">#{tp.tag}</span>
                  <span className="x-topicrow__count">{fmtCount(tp.count)} {t('x.posts')}</span>
                </button>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
