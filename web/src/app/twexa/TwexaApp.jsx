import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './TwexaApp.css';

import { fetchNui } from '../../utils/fetchNui';
import {
    loadSession,
    clearCapture,
    clearPendingCompose,
    clearPendingEdit,
} from '../../store/slices/xSlice';
import { clearNotifsFor } from '../../store/slices/notificationsSlice';
import { setLightbox } from '../../store/slices/photosSlice';
import { clearDeliver } from '../../store/slices/airdropSlice';
import { XNavContext } from './XNav';
import { CloseIcon } from './icons';
import VideoPlayer from '../photos/components/VideoPlayer';

import AuthScreen from './AuthScreen';
import VerifyScreen from './VerifyScreen';
import Feed from './Feed';
import Compose from './Compose';
import PostDetail from './PostDetail';
import Profile from './Profile';
import EditProfile from './EditProfile';
import SearchScreen from './SearchScreen';
import TopicScreen from './TopicScreen';
import NotificationsScreen from './NotificationsScreen';
import FollowListScreen from './FollowListScreen';
import EngagersScreen from './EngagersScreen';
import ShareProfileSheet from './ShareProfileSheet';

export default function TwexaApp() {
    const dispatch = useDispatch();
    const me = useSelector((s) => s.x.me);
    const loaded = useSelector((s) => s.x.loaded);
    const capture = useSelector((s) => s.x.capture);
    const pendingCompose = useSelector((s) => s.x.pendingCompose);
    const pendingEdit = useSelector((s) => s.x.pendingEdit);
    const pendingAuth = useSelector((s) => s.x.pendingAuth);
    const deliver = useSelector((s) => s.airdrop.deliver);

    const [stack, setStack] = useState([{ name: 'feed' }]);
    const [reloadToken, setReloadToken] = useState(0);
    const [video, setVideo] = useState(null);
    const [share, setShare] = useState(null);
    const [editProfile, setEditProfile] = useState(null);
    const [editCrop, setEditCrop] = useState(null);

    const bumpReload = useCallback(() => setReloadToken((n) => n + 1), []);
    const push = useCallback((view) => setStack((s) => [...s, view]), []);
    const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
    const resetTo = useCallback((view) => setStack([view]), []);

    useEffect(() => {
        if (!loaded) dispatch(loadSession());
        dispatch(clearNotifsFor({ app: 'twexa' }));
    }, [loaded, dispatch]);

    useEffect(() => {
        if (pendingCompose && me) {
            const initialMedia = capture ? [{ url: capture.url, type: capture.type }] : [];
            push({ name: 'compose', replyTo: pendingCompose.replyTo || null, initialMedia });
            dispatch(clearPendingCompose());
            dispatch(clearCapture());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingCompose, me]);

    useEffect(() => {
        if (pendingEdit && me) {
            if (capture) setEditCrop({ field: pendingEdit.field, url: capture.url });
            setEditProfile('self');
            dispatch(clearPendingEdit());
            dispatch(clearCapture());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingEdit, me]);

    useEffect(() => {
        if (deliver && deliver.appId === 'twexa' && me) {
            const handle = deliver.payload && deliver.payload.handle;
            dispatch(clearDeliver());
            if (handle) setStack((s) => [...s, { name: 'profile', target: { handle } }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deliver, me]);

    const nav = useMemo(
        () => ({
            openProfile: (target) => push({ name: 'profile', target: target || null }),
            openPost: (id) => push({ name: 'post', id }),
            openHashtag: (tag) => push({ name: 'topic', tag }),
            openCompose: (opts) =>
                push({ name: 'compose', replyTo: (opts && opts.replyTo) || null }),
            openLightbox: (url) => dispatch(setLightbox(url)),
            openVideo: (media) => setVideo(media),
            openShareProfile: (profile) => setShare(profile),
            openFollowList: (opts) =>
                push({
                    name: 'followlist',
                    target: opts.target,
                    tab: opts.tab,
                    isSelf: opts.isSelf,
                }),
            openEngagers: (opts) => push({ name: 'engagers', postId: opts.postId, tab: opts.tab }),
            openSearch: () => push({ name: 'search' }),
            openNotifs: () => push({ name: 'notifs' }),
        }),
        [push, dispatch],
    );

    if (pendingAuth) {
        return (
            <div className="xapp">
                <VerifyScreen />
            </div>
        );
    }

    if (!me) {
        return (
            <div className="xapp">
                {loaded ? <AuthScreen /> : <div className="x-empty">{''}</div>}
            </div>
        );
    }

    const renderView = (view) => {
        if (view.name === 'feed')
            return (
                <Feed
                    me={me}
                    reloadToken={reloadToken}
                    onOpenSearch={nav.openSearch}
                    onOpenNotifs={nav.openNotifs}
                />
            );
        if (view.name === 'compose')
            return (
                <Compose
                    me={me}
                    replyTo={view.replyTo}
                    initialMedia={view.initialMedia}
                    onClose={back}
                    onPosted={() => {
                        back();
                        bumpReload();
                    }}
                />
            );
        if (view.name === 'post')
            return <PostDetail id={view.id} me={me} reloadToken={reloadToken} onBack={back} />;
        if (view.name === 'profile')
            return (
                <Profile
                    target={view.target}
                    me={me}
                    reloadToken={reloadToken}
                    onBack={back}
                    onEdit={() => setEditProfile('self')}
                />
            );
        if (view.name === 'topic') return <TopicScreen tag={view.tag} me={me} onBack={back} />;
        if (view.name === 'followlist')
            return (
                <FollowListScreen
                    target={view.target}
                    initialTab={view.tab}
                    isSelf={view.isSelf}
                    me={me}
                    onBack={back}
                />
            );
        if (view.name === 'engagers')
            return <EngagersScreen postId={view.postId} initialTab={view.tab} onBack={back} />;
        if (view.name === 'search') return <SearchScreen onBack={back} />;
        if (view.name === 'notifs') return <NotificationsScreen onBack={back} />;
        return null;
    };

    return (
        <XNavContext.Provider value={nav}>
            <div className="xapp">
                <ScreenStack stack={stack} renderView={renderView} />

                {editProfile && (
                    <EditProfileOverlay
                        initialCrop={editCrop}
                        onClose={() => {
                            setEditProfile(null);
                            setEditCrop(null);
                        }}
                        onSaved={() => {
                            setEditProfile(null);
                            setEditCrop(null);
                            bumpReload();
                        }}
                    />
                )}

                {video && (
                    <div className="x-viewer x-viewer--in" onClick={() => setVideo(null)}>
                        <button className="x-viewer__close" onClick={() => setVideo(null)}>
                            <CloseIcon />
                        </button>
                        <div
                            className="x-viewer__stage x-viewer__stage--in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <VideoPlayer src={video.url} poster={video.thumb} />
                        </div>
                    </div>
                )}

                {share && <ShareProfileSheet profile={share} onClose={() => setShare(null)} />}
            </div>
        </XNavContext.Provider>
    );
}

function ScreenStack({ stack, renderView }) {
    const idRef = useRef(0);
    const firstRef = useRef(true);
    const [layers, setLayers] = useState(() => [
        { id: 0, view: stack[stack.length - 1], anim: null },
    ]);
    const prevRef = useRef({ len: stack.length, top: stack[stack.length - 1] });

    useEffect(() => {
        const prev = prevRef.current;
        const top = stack[stack.length - 1];
        prevRef.current = { len: stack.length, top };
        if (firstRef.current) {
            firstRef.current = false;
            return;
        }
        if (stack.length > prev.len) {
            const anim = top.name === 'compose' || top.name === 'post' ? 'drop-in' : 'push-in';
            setLayers((cur) => [
                { ...cur[cur.length - 1], anim: null },
                { id: ++idRef.current, view: top, anim },
            ]);
        } else if (stack.length < prev.len) {
            const anim =
                prev.top.name === 'compose' || prev.top.name === 'post' ? 'drop-out' : 'push-out';
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
        if (layer.anim === 'push-in' || layer.anim === 'sheet-in' || layer.anim === 'drop-in') {
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
                    className={`x-layer${l.anim ? ` x-layer--${l.anim}` : ''}`}
                    onAnimationEnd={l.anim ? (e) => settle(l, e) : undefined}
                >
                    {renderView(l.view)}
                </div>
            ))}
        </>
    );
}

function EditProfileOverlay({ initialCrop, onClose, onSaved }) {
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        fetchNui('phone:x:profile', {}, { ok: true, profile: null }).then(
            (r) => r && r.ok && setProfile(r.profile),
        );
    }, []);
    if (!profile) return null;
    return (
        <div className="x-overlay">
            <EditProfile
                profile={profile}
                initialCrop={initialCrop}
                onBack={onClose}
                onSaved={onSaved}
            />
        </div>
    );
}
