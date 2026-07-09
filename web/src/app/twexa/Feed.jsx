import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import Avatar from './Avatar';
import PostCard from './PostCard';
import { XLogo, SearchIcon, BellIcon, PlusIcon } from './icons';

const MOCK_FEED = [
    {
        id: 101,
        text: 'Bro how long are we going to wait for a new city?! #vicecity',
        media: [],
        createdAt: Math.floor(Date.now() / 1000) - 3600,
        author: { id: 2, handle: 'realalicia', name: 'Alicia Keys', verified: true },
        likeCount: 72,
        liked: false,
        repostCount: 1,
        reposted: false,
        replyCount: 4,
    },
    {
        id: 102,
        text: 'Los Santos is ours',
        media: [],
        createdAt: Math.floor(Date.now() / 1000) - 7200,
        author: { id: 3, handle: 'vicepresmc', name: 'Jake', verified: false },
        likeCount: 12,
        liked: true,
        repostCount: 0,
        reposted: false,
        replyCount: 0,
    },
];

export default function Feed({ me, reloadToken, onOpenSearch, onOpenNotifs }) {
    const t = useT();
    const nav = useXNav();
    const liveTick = useSelector((s) => s.x.liveTick);
    const [tab, setTab] = useState('foryou');
    const [items, setItems] = useState(null);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let alive = true;
        fetchNui('phone:x:feed', { tab }, { ok: true, items: MOCK_FEED }).then((r) => {
            if (alive && r && r.ok) setItems(r.items || []);
        });
        return () => {
            alive = false;
        };
    }, [tab, reloadToken, liveTick, nonce]);

    return (
        <div className="x-screen x-feed">
            <div className="x-feed__top">
                <div className="x-feed__topbar">
                    <Avatar account={me} size="2em" onClick={() => nav.openProfile(null)} />
                    <span className="x-feed__logo">
                        <XLogo size={22} />
                    </span>
                    <div className="x-feed__topicons">
                        <button className="x-iconbtn" onClick={onOpenSearch}>
                            <SearchIcon size={20} />
                        </button>
                        <button className="x-iconbtn" onClick={onOpenNotifs}>
                            <BellIcon size={20} />
                        </button>
                    </div>
                </div>
                <div className="x-feed__tabs">
                    {['foryou', 'following'].map((k) => (
                        <button
                            key={k}
                            className={`x-feed__tab${tab === k ? ' is-on' : ''}`}
                            onClick={() => setTab(k)}
                        >
                            {t(`x.${k}`)}
                            {tab === k && <span className="x-feed__tabind" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="x-scroll x-feed__scroll">
                {items === null ? (
                    <div className="x-empty">{t('x.loading')}</div>
                ) : items.length === 0 ? (
                    <div className="x-empty">
                        {tab === 'following' ? t('x.followingEmpty') : t('x.feedEmpty')}
                    </div>
                ) : (
                    <div className="x-list">
                        {items.map((p) => (
                            <PostCard
                                key={`${p.id}-${p.feedTs || ''}`}
                                post={p}
                                me={me}
                                onChanged={() => setNonce((n) => n + 1)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <button className="x-fab" onClick={() => nav.openCompose()}>
                <PlusIcon />
            </button>
        </div>
    );
}