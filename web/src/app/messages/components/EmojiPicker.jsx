import { useState } from 'react';
import { CATEGORIES, ALL_EMOJIS } from './emojiData';

const RECENTS_KEY = 'oph3z:emojiRecents';
const loadRecents = () => {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; } catch { return []; }
};
const saveRecents = (list) => {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
};

const SearchIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

// iOS-style emoji keyboard: sits below the input (input stays visible). Search
// field, a Recents tab, and category tabs. Tapping an emoji inserts it and
// remembers it in Recents.
export default function EmojiPicker({ onSelect, onClose }) {
  const [recents, setRecents] = useState(loadRecents);
  const [cat, setCat] = useState('recents');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const pick = (e) => {
    onSelect(e);
    setRecents((prev) => {
      const next = [e, ...prev.filter((x) => x !== e)].slice(0, 32);
      saveRecents(next);
      return next;
    });
  };

  let items;
  if (q) {
    items = ALL_EMOJIS.filter(([, n]) => n.includes(q)).map(([e]) => e);
  } else if (cat === 'recents') {
    items = recents;
  } else {
    const c = CATEGORIES.find((x) => x.key === cat);
    items = c ? c.emojis.map(([e]) => e) : [];
  }

  const tabs = [{ key: 'recents', tab: '🕐' }, ...CATEGORIES.map((c) => ({ key: c.key, tab: c.tab }))];

  return (
    <div className="msg-emoji">
        <button className="msg-emoji__grab" onClick={onClose} aria-label="Close" />

        <div className="msg-emoji__searchrow">
          <SearchIcon />
          <input
            className="msg-emoji__search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji…"
          />
        </div>

        {items.length === 0 ? (
          <div className="msg-emoji__empty">
            {q ? 'No Emoji Found' : "You haven't used any emoji yet"}
          </div>
        ) : (
          <div className="msg-emoji__grid">
            {items.map((e, i) => (
              <button key={`${e}-${i}`} className="msg-emoji__cell" onClick={() => pick(e)}>
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="msg-emoji__tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`msg-emoji__tab${!q && t.key === cat ? ' is-on' : ''}`}
              onClick={() => { setQuery(''); setCat(t.key); }}
            >
              {t.tab}
            </button>
          ))}
        </div>
    </div>
  );
}
