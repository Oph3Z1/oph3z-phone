import { useEffect, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import ListingCard from './ListingCard';
import { BackArrow, SearchIcon, CloseIcon } from './icons';

export default function SearchScreen({ onBack }) {
    const t = useT();
    const [q, setQ] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const query = q.trim();
        if (!query) {
            setItems([]);
            setLoading(false);
            return undefined;
        }
        let alive = true;
        setLoading(true);
        const id = setTimeout(() => {
            fetchNui(
                'phone:market:feed',
                { category: 'all', q: query },
                { ok: true, listings: [] },
            ).then((r) => {
                if (alive && r && r.ok) {
                    setItems(r.listings || []);
                    setLoading(false);
                }
            });
        }, 220);
        return () => {
            alive = false;
            clearTimeout(id);
        };
    }, [q]);

    return (
        <div className="mkt-screen">
            <div className="mkt-topbar mkt-topbar--search">
                <button className="mkt-iconbtn" onClick={onBack}>
                    <BackArrow />
                </button>
                <div className="mkt-searchbar">
                    <SearchIcon size={17} />
                    <input
                        autoFocus
                        value={q}
                        placeholder={t('market.searchPh')}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    {q ? (
                        <button className="mkt-searchbar__clr" onClick={() => setQ('')}>
                            <CloseIcon size={15} />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="mkt-scroll">
                {!q.trim() ? (
                    <div className="mkt-empty mkt-empty--sm">{t('market.searchHint')}</div>
                ) : loading ? (
                    <div className="mkt-empty mkt-empty--sm">{t('market.loading')}</div>
                ) : items.length === 0 ? (
                    <div className="mkt-empty mkt-empty--sm">{t('market.noResults')}</div>
                ) : (
                    <div className="mkt-grid">
                        {items.map((l) => (
                            <ListingCard key={l.id} listing={l} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}