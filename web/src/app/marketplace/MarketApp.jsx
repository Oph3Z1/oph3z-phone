import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

    const renderView = (view) => {
        if (view.name === 'feed') return <Feed reloadToken={reloadToken} />;
        if (view.name === 'listing')
            return <ListingDetail id={view.id} onBack={back} onChanged={bumpReload} />;
        if (view.name === 'profile')
            return <Profile cid={view.cid} reloadToken={reloadToken} onBack={back} />;
        if (view.name === 'compose')
            return (
                <NewPost
                    onBack={back}
                    onPosted={() => {
                        back();
                        bumpReload();
                    }}
                />
            );
        if (view.name === 'search') return <SearchScreen onBack={back} />;
        return null;
    };

    return (
        <MarketNavContext.Provider value={nav}>
            <div className="mktapp">
                <MarketStack stack={stack} renderView={renderView} />
            </div>
        </MarketNavContext.Provider>
    );
}

function MarketStack({ stack, renderView }) {
    const idRef = useRef(0);
    const firstRef = useRef(true);
    const [layers, setLayers] = useState(() => [
        { id: 0, view: stack[stack.length - 1], anim: null },
    ]);
    const prevRef = useRef({ len: stack.length, top: stack[stack.length - 1] });

    const fadeName = (n) => n === 'compose' || n === 'listing';

    useEffect(() => {
        const prev = prevRef.current;
        const top = stack[stack.length - 1];
        prevRef.current = { len: stack.length, top };
        if (firstRef.current) {
            firstRef.current = false;
            return;
        }
        if (stack.length > prev.len) {
            const anim = fadeName(top.name) ? 'drop-in' : 'push-in';
            setLayers((cur) => [
                { ...cur[cur.length - 1], anim: null },
                { id: ++idRef.current, view: top, anim },
            ]);
        } else if (stack.length < prev.len) {
            const anim = fadeName(prev.top.name) ? 'drop-out' : 'push-out';
            setLayers((cur) => [
                { id: ++idRef.current, view: top, anim: null },
                { id: cur[cur.length - 1].id, view: prev.top, anim },
            ]);
        } else {
            setLayers([{ id: ++idRef.current, view: top, anim: null }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stack]);

    const settle = (layer, e) => {
        if (e.target !== e.currentTarget) return;
        const el = e.currentTarget;
        if (layer.anim === 'push-in' || layer.anim === 'drop-in') {
            setLayers([{ id: layer.id, view: layer.view, anim: null }]);
            el.style.animation = 'none';
            requestAnimationFrame(() => {
                el.style.animation = '';
            });
        } else {
            setLayers((cur) => cur.filter((l) => l.id !== layer.id));
        }
    };

    return (
        <>
            {layers.map((l) => (
                <div
                    key={l.id}
                    className={`mkt-layer${l.anim ? ` mkt-layer--${l.anim}` : ''}`}
                    onAnimationEnd={l.anim ? (e) => settle(l, e) : undefined}
                >
                    {renderView(l.view)}
                </div>
            ))}
        </>
    );
}
