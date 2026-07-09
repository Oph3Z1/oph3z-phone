import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './MarketApp.css';

import { startDraft, setReopenCompose } from '../../store/slices/marketplaceSlice';
import { clearDeliver } from '../../store/slices/airdropSlice';
import { MarketNavContext } from './MarketNav';
import Feed from './Feed';
import ListingDetail from './ListingDetail';
import Profile from './Profile';
import NewPost from './NewPost';
import SearchScreen from './SearchScreen';

export default function MarketApp() {
    const dispatch = useDispatch();
    const reopenCompose = useSelector((s) => s.marketplace.reopenCompose);
    const deliver = useSelector((s) => s.airdrop.deliver);

    const [stack, setStack] = useState([{ name: 'feed' }]);
    const [reloadToken, setReloadToken] = useState(0);

    const push = useCallback((view) => setStack((s) => [...s, view]), []);
    const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
    const bumpReload = useCallback(() => setReloadToken((n) => n + 1), []);

    useEffect(() => {
        if (reopenCompose) {
            setStack((s) => (s[s.length - 1].name === 'compose' ? s : [...s, { name: 'compose' }]));
            dispatch(setReopenCompose(false));
        }
    }, [reopenCompose, dispatch]);

    useEffect(() => {
        if (deliver && deliver.appId === 'marketplace') {
            const p = deliver.payload || {};
            dispatch(clearDeliver());
            if (p.listingId) setStack([{ name: 'feed' }, { name: 'listing', id: p.listingId }]);
            else if (p.cid) setStack([{ name: 'feed' }, { name: 'profile', cid: p.cid }]);
        }
    }, [deliver, dispatch]);

    const nav = useMemo(
        () => ({
            openListing: (id) => push({ name: 'listing', id }),
            openProfile: (cid) => push({ name: 'profile', cid: cid || null }),
            openSearch: () => push({ name: 'search' }),
            openCompose: () => {
                dispatch(startDraft({ mode: 'new' }));
                push({ name: 'compose' });
            },
            openEdit: (l) => {
                dispatch(
                    startDraft({
                        mode: 'edit',
                        id: l.id,
                        category: l.category,
                        title: l.title,
                        desc: l.desc,
                        price: l.price ? String(l.price) : '',
                        media: (l.media || []).map((m) => ({ ...m })),
                        allowCalls: l.allowCalls,
                        allowMsg: l.allowMsg,
                    }),
                );
                push({ name: 'compose' });
            },
        }),
        [push, dispatch],
    );

    const view = stack[stack.length - 1];
    let screen;
    if (view.name === 'feed') {
        screen = <Feed reloadToken={reloadToken} />;
    } else if (view.name === 'listing') {
        screen = <ListingDetail id={view.id} onBack={back} onChanged={bumpReload} />;
    } else if (view.name === 'profile') {
        screen = <Profile cid={view.cid} reloadToken={reloadToken} onBack={back} />;
    } else if (view.name === 'compose') {
        screen = (
            <NewPost
                onBack={back}
                onPosted={() => {
                    back();
                    bumpReload();
                }}
            />
        );
    } else if (view.name === 'search') {
        screen = <SearchScreen onBack={back} />;
    }

    return (
        <MarketNavContext.Provider value={nav}>
            <div className="mktapp">{screen}</div>
        </MarketNavContext.Provider>
    );
}