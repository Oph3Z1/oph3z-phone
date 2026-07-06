import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './XApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { loadSession, clearCapture, clearPendingCompose, clearPendingEdit } from '../../store/slices/xSlice';
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

export default function XApp() {
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
  const [video, setVideo] = useState(null);   // media object for the in-phone viewer
  const [share, setShare] = useState(null);    // profile being shared
  const [editProfile, setEditProfile] = useState(null); // truthy => Edit Profile overlay open
  const [editCrop, setEditCrop] = useState(null); // { field, url } to seed the cropper on reopen

  const bumpReload = useCallback(() => setReloadToken((n) => n + 1), []);
  const push = useCallback((view) => setStack((s) => [...s, view]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const resetTo = useCallback((view) => setStack([view]), []);

  // Session ("stay logged in") + clear X notifications from the phone center.
  useEffect(() => {
    if (!loaded) dispatch(loadSession());
    dispatch(clearNotifsFor({ app: 'x' }));
  }, [loaded, dispatch]);

  // Returning from the Camera: re-open the composer with the captured media.
  useEffect(() => {
    if (pendingCompose && me) {
      const initialMedia = capture ? [{ url: capture.url, type: capture.type }] : [];
      push({ name: 'compose', replyTo: pendingCompose.replyTo || null, initialMedia });
      dispatch(clearPendingCompose());
      dispatch(clearCapture());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCompose, me]);

  // Returning from the Camera for a profile photo: reopen the editor + cropper.
  useEffect(() => {
    if (pendingEdit && me) {
      if (capture) setEditCrop({ field: pendingEdit.field, url: capture.url });
      setEditProfile('self');
      dispatch(clearPendingEdit());
      dispatch(clearCapture());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEdit, me]);

  // A shared X profile was delivered (AirDrop accept or a Messages card tap).
  useEffect(() => {
    if (deliver && deliver.appId === 'x' && me) {
      const handle = deliver.payload && deliver.payload.handle;
      dispatch(clearDeliver());
      if (handle) setStack((s) => [...s, { name: 'profile', target: { handle } }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliver, me]);

  const nav = useMemo(() => ({
    openProfile: (target) => push({ name: 'profile', target: target || null }),
    openPost: (id) => push({ name: 'post', id }),
    openHashtag: (tag) => push({ name: 'topic', tag }),
    openCompose: (opts) => push({ name: 'compose', replyTo: (opts && opts.replyTo) || null }),
    openLightbox: (url) => dispatch(setLightbox(url)),
    openVideo: (media) => setVideo(media),
    openShareProfile: (profile) => setShare(profile),
    openFollowList: (opts) => push({ name: 'followlist', target: opts.target, tab: opts.tab, isSelf: opts.isSelf }),
    openEngagers: (opts) => push({ name: 'engagers', postId: opts.postId, tab: opts.tab }),
    openSearch: () => push({ name: 'search' }),
    openNotifs: () => push({ name: 'notifs' }),
  }), [push, dispatch]);

  // A verification code is pending (register / recover / email change): show the
  // code screen over everything so it survives switching to the Mail app.
  if (pendingAuth) {
    return <div className="xapp"><VerifyScreen /></div>;
  }

  // Not logged in -> gate. (Session still loading shows nothing briefly.)
  if (!me) {
    return (
      <div className="xapp">
        {loaded ? <AuthScreen /> : <div className="x-empty">{''}</div>}
      </div>
    );
  }

  const view = stack[stack.length - 1];

  let screen;
  if (view.name === 'feed') {
    screen = <Feed me={me} reloadToken={reloadToken} onOpenSearch={nav.openSearch} onOpenNotifs={nav.openNotifs} />;
  } else if (view.name === 'compose') {
    screen = (
      <Compose
        me={me}
        replyTo={view.replyTo}
        initialMedia={view.initialMedia}
        onClose={back}
        onPosted={() => { back(); bumpReload(); }}
      />
    );
  } else if (view.name === 'post') {
    screen = <PostDetail id={view.id} me={me} reloadToken={reloadToken} onBack={back} />;
  } else if (view.name === 'profile') {
    screen = (
      <Profile
        target={view.target}
        me={me}
        reloadToken={reloadToken}
        onBack={back}
        onEdit={() => { /* open editor with the freshest profile */ setEditProfile('self'); }}
      />
    );
  } else if (view.name === 'topic') {
    screen = <TopicScreen tag={view.tag} me={me} onBack={back} />;
  } else if (view.name === 'followlist') {
    screen = <FollowListScreen target={view.target} initialTab={view.tab} isSelf={view.isSelf} me={me} onBack={back} />;
  } else if (view.name === 'engagers') {
    screen = <EngagersScreen postId={view.postId} initialTab={view.tab} onBack={back} />;
  } else if (view.name === 'search') {
    screen = <SearchScreen onBack={back} />;
  } else if (view.name === 'notifs') {
    screen = <NotificationsScreen onBack={back} />;
  }

  return (
    <XNavContext.Provider value={nav}>
      <div className="xapp">
        {screen}

        {/* Edit profile as an overlay (fetches own profile). */}
        {editProfile && (
          <EditProfileOverlay
            initialCrop={editCrop}
            onClose={() => { setEditProfile(null); setEditCrop(null); }}
            onSaved={() => { setEditProfile(null); setEditCrop(null); bumpReload(); }}
          />
        )}

        {/* In-phone video viewer. */}
        {video && (
          <div className="x-viewer" onClick={() => setVideo(null)}>
            <button className="x-viewer__close" onClick={() => setVideo(null)}><CloseIcon /></button>
            <div className="x-viewer__stage" onClick={(e) => e.stopPropagation()}>
              <VideoPlayer src={video.url} poster={video.thumb} />
            </div>
          </div>
        )}

        {/* Share a profile (AirDrop / Messages / Copy). */}
        {share && <ShareProfileSheet profile={share} onClose={() => setShare(null)} />}
      </div>
    </XNavContext.Provider>
  );
}

// Loads the logged-in account's full profile, then shows the editor.
function EditProfileOverlay({ initialCrop, onClose, onSaved }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    fetchNui('phone:x:profile', {}, { ok: true, profile: null }).then((r) => r && r.ok && setProfile(r.profile));
  }, []);
  if (!profile) return null;
  return (
    <div className="x-overlay">
      <EditProfile profile={profile} initialCrop={initialCrop} onBack={onClose} onSaved={onSaved} />
    </div>
  );
}
