import { useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../../utils/fetchNui';
import { isEnvBrowser } from '../../../utils/misc';
import { useT } from '../../../i18n/useT';

// Browser-dev fallback so the picker isn't empty via `npm run dev`.
const MOCK_RESULTS = [
  { id: '1', preview: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', full: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
];

// Build a GIPHY endpoint (search when there's a query, trending otherwise).
function giphyUrl(apiKey, q) {
  const base = q
    ? 'https://api.giphy.com/v1/gifs/search'
    : 'https://api.giphy.com/v1/gifs/trending';
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: '24',
    rating: 'pg-13',
    bundle: 'messaging_non_clips',
  });
  if (q) params.set('q', q);
  return `${base}?${params.toString()}`;
}

export default function GifPicker({ onClose, onSelect }) {
  const tr = useT();
  const [cfg, setCfg] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | empty | nokey | error
  const reqId = useRef(0);

  // Load the GIPHY config once.
  useEffect(() => {
    fetchNui('phone:gif:config', {}, { apiKey: isEnvBrowser() ? 'dev' : '' }).then((c) => setCfg(c || {}));
  }, []);

  // Fetch GIFs whenever the (debounced) query or config changes.
  useEffect(() => {
    if (!cfg) return;
    if (!cfg.apiKey) {
      setStatus('nokey');
      return;
    }
    const my = ++reqId.current;
    setStatus('loading');
    const t = setTimeout(async () => {
      try {
        if (isEnvBrowser()) {
          setResults(MOCK_RESULTS);
          setStatus('ok');
          return;
        }
        const res = await fetch(giphyUrl(cfg.apiKey, query.trim()));
        const data = await res.json();
        if (my !== reqId.current) return; // a newer query superseded this one
        const items = (data.data || [])
          .map((g) => {
            const img = g.images || {};
            const preview = (img.fixed_width && img.fixed_width.url) || (img.original && img.original.url);
            const full = (img.original && img.original.url) || preview;
            return preview && full ? { id: g.id, preview, full } : null;
          })
          .filter(Boolean);
        setResults(items);
        setStatus(items.length ? 'ok' : 'empty');
      } catch (e) {
        if (my === reqId.current) setStatus('error');
      }
    }, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [cfg, query]);

  return (
    <>
      <div className="msg-cash-backdrop" onClick={onClose} />
      <div className="msg-gifs">
        <button className="msg-cash__grab" onClick={onClose} aria-label="Close" />

        <div className="msg-gifs__searchrow">
          <input
            className="msg-gifs__search"
            value={query}
            placeholder={tr('messages.searchGiphy')}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {status === 'loading' && <div className="msg-gifs__note">{tr('messages.loading')}</div>}
        {status === 'nokey' && <div className="msg-gifs__note">{tr('messages.gifNoKey')}</div>}
        {status === 'empty' && <div className="msg-gifs__note">{tr('messages.noGifs')}</div>}
        {status === 'error' && <div className="msg-gifs__note">{tr('messages.gifError')}</div>}

        {status === 'ok' && (
          <div className="msg-gifs__grid">
            {results.map((g) => (
              <button key={g.id} className="msg-gifs__cell" onClick={() => onSelect(g.full)}>
                <img src={g.preview} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
