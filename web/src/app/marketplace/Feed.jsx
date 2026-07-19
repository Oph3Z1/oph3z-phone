import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { useMarketNav } from './MarketNav';
import { FILTERS, CATEGORY_ICON } from './util';
import ListingCard from './ListingCard';
import Avatar from './Avatar';
import { SearchIcon, PlusIcon } from './icons';

const MOCK = [
    {
        id: 1,
        category: 'cars',
        title: 'Karin Sultan RS — clean title',
        price: 145000,
        createdAt: Math.floor(Date.now() / 1000) - 3600,
        media: [{ url: 'https://picsum.photos/seed/car1/600', type: 'image' }],
        seller: { cid: 'x', name: 'Mike Ross', avatar: null },
    },
    {
        id: 2,
        category: 'houses',
        title: 'Vinewood 2BR with view',
        price: 890000,
        createdAt: Math.floor(Date.now() / 1000) - 8000,
        media: [
            { url: 'https://picsum.photos/seed/house1/600', type: 'image' },
            { url: 'https://picsum.photos/seed/house2/600', type: 'image' },
        ],
        seller: { cid: 'y', name: 'Ava Lane', avatar: null },
    },
    {
        id: 3,
        category: 'items',
        title: 'Lockpick set x5',
        price: 0,
        createdAt: Math.floor(Date.now() / 1000) - 20000,
        media: [{ url: 'https://picsum.photos/seed/item1/600', type: 'image' }],
        seller: { cid: 'z', name: 'Rico', avatar: null },
    },
];

export default function Feed({ reloadToken }) {
    const t = useT();
    const nav = useMarketNav();
    const meAvatar = useSelector((s) => s.phone.identity.avatar);
    const meName = useSelector((s) => s.phone.identity.name);
    const [cat, setCat] = useState('all');
    const [items, setItems] = useState(null);

    const chipsRef = useRef(null);
    const drag = useRef({ down: false, startX: 0, scroll: 0, moved: false });
    const onDown = (e) => {
        const el = chipsRef.current;
        drag.current = { down: true, startX: e.clientX, scroll: el.scrollLeft, moved: false };
    };
    const onMove = (e) => {
        if (!drag.current.down) return;
        const dx = e.clientX - drag.current.startX;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        chipsRef.current.scrollLeft = drag.current.scroll - dx;
    };
    const endDrag = () => {
        drag.current.down = false;
    };
    const pick = (k) => {
        if (!drag.current.moved) setCat(k);
    };

    useEffect(() => {
        let alive = true;
        setItems(null);
        fetchNui(
            'phone:market:feed',
            { category: cat },
            { ok: true, listings: MOCK.filter((l) => cat === 'all' || l.category === cat) },
        ).then((r) => {
            if (alive && r && r.ok) setItems(r.listings || []);
        });
        return () => {
            alive = false;
        };
    }, [cat, reloadToken]);

    return (
        <div className="mkt-screen">
            <div className="mkt-header">
                <div className="mkt-header__row">
                    <h1 className="mkt-header__title">{t('market.title')}</h1>
                    <div className="mkt-header__actions">
                        <button
                            className="mkt-iconbtn"
                            onClick={nav.openSearch}
                            aria-label={t('market.search')}
                        >
                            <SearchIcon size={20} />
                        </button>
                        <button
                            className="mkt-header__me"
                            onClick={() => nav.openProfile(null)}
                            aria-label={t('market.myProfile')}
                        >
                            <Avatar account={{ name: meName, avatar: meAvatar }} size="2em" />
                        </button>
                    </div>
                </div>

                <div
                    className="mkt-chips"
                    ref={chipsRef}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                    onPointerLeave={endDrag}
                >
                    {FILTERS.map((k) => (
                        <button
                            key={k}
                            className={`mkt-chip${cat === k ? ' is-on' : ''}`}
                            onClick={() => pick(k)}
                        >
                            <span className="mkt-chip__ico">{CATEGORY_ICON[k]}</span>
                            {t(`market.cat_${k}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mkt-scroll">
                {items === null ? (
                    <div className="mkt-spinner" />
                ) : items.length === 0 ? (
                    <div className="mkt-empty">
                        <div className="mkt-empty__glyph">{CATEGORY_ICON[cat] || '🛍️'}</div>
                        <div className="mkt-empty__title">{t('market.noneTitle')}</div>
                        <div className="mkt-empty__sub">{t('market.noneSub')}</div>
                    </div>
                ) : (
                    <div className="mkt-grid">
                        {items.map((l, i) => (
                            <ListingCard key={l.id} listing={l} animateIn index={i} />
                        ))}
                    </div>
                )}
            </div>

            <button className="mkt-fab" onClick={nav.openCompose} aria-label={t('market.newPost')}>
                <PlusIcon size={24} />
            </button>
        </div>
    );
}
