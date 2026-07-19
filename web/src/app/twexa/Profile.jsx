import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { doLogout } from '../../store/slices/xSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import { fmtCount } from './xUtil';
import Avatar from './Avatar';
import RichText from './RichText';
import PostCard from './PostCard';
import { BackArrow, ShareIcon, LogoutIcon, Verified } from './icons';

export default function Profile({ target, me, reloadToken, onBack, onEdit }) {
    const t = useT();
    const dispatch = useDispatch();
    const nav = useXNav();

    const logout = async () => {
        const ok = await dispatch(
            openDialog({
                title: t('x.logoutTitle'),
                message: t('x.logoutMsg'),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('x.logOut'), style: 'destructive', value: true },
                ],
            }),
        );
        if (ok) dispatch(doLogout());
    };
    const [p, setP] = useState(null);
    const [tab, setTab] = useState('posts');
    const [following, setFollowing] = useState(false);
    const [followers, setFollowers] = useState(0);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        const res = await fetchNui('phone:x:profile', target || {}, { ok: true, profile: null });
        if (res && res.ok && res.profile) {
            setP(res.profile);
            setFollowing(res.profile.isFollowing);
            setFollowers(res.profile.followersCount);
        }
    };
    useEffect(() => {
        load(); /* eslint-disable-next-line */
    }, [target && (target.handle || target.id), reloadToken]);

    const toggleFollow = async () => {
        if (busy || !p) return;
        setBusy(true);
        const next = !following;
        setFollowing(next);
        setFollowers((c) => c + (next ? 1 : -1));
        const res = await fetchNui(
            'phone:x:follow',
            { id: p.id, on: next },
            { ok: true, following: next, followersCount: followers + (next ? 1 : -1) },
        );
        setBusy(false);
        if (res && res.ok) {
            setFollowing(res.following);
            setFollowers(res.followersCount);
        }
    };

    const authored = useMemo(() => (p ? (p.posts || []).filter((x) => !x.repostBy) : []), [p]);
    const reposts = useMemo(() => (p ? (p.posts || []).filter((x) => x.repostBy) : []), [p]);
    const mediaPosts = useMemo(() => authored.filter((x) => x.media && x.media.length), [authored]);
    const list =
        tab === 'replies'
            ? p && p.replies
            : tab === 'media'
              ? mediaPosts
              : tab === 'reposts'
                ? reposts
                : authored;

    if (!p) {
        return (
            <div className="x-screen">
                <div className="x-topbar">
                    <button className="x-iconbtn" onClick={onBack}>
                        <BackArrow />
                    </button>
                    <span className="x-topbar__spacer" />
                </div>
                <div className="x-empty">{t('x.loading')}</div>
            </div>
        );
    }

    return (
        <div className="x-screen x-profile">
            <div className="x-topbar x-topbar--overlay">
                <button className="x-iconbtn x-iconbtn--onbanner" onClick={onBack}>
                    <BackArrow size={18} />
                </button>
                <span className="x-topbar__spacer" />
            </div>

            <div className="x-scroll">
                <div
                    className="x-profile__banner"
                    style={p.banner ? { backgroundImage: `url(${p.banner})` } : undefined}
                />

                <div className="x-profile__head">
                    <Avatar account={p} size="5em" className="x-profile__avatar" />
                    <div className="x-profile__actions">
                        {p.isMe && (
                            <button
                                className="x-profile__actbtn"
                                onClick={logout}
                                aria-label={t('x.logOut')}
                            >
                                <LogoutIcon size={12} />
                            </button>
                        )}
                        <button
                            className="x-profile__actbtn"
                            onClick={() => nav.openShareProfile && nav.openShareProfile(p)}
                            aria-label="Share"
                        >
                            <ShareIcon size={14} />
                        </button>
                        {p.isMe ? (
                            <button className="x-btn x-btn--outline" onClick={onEdit}>
                                {t('x.editProfile')}
                            </button>
                        ) : (
                            <button
                                className={`x-btn${following ? ' x-btn--outline' : ' x-btn--solid'}`}
                                onClick={toggleFollow}
                            >
                                {following ? t('x.following') : t('x.follow')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="x-profile__id">
                    <div className="x-profile__name">
                        {p.name}
                        <Verified size={17} tier={p.badge} />
                    </div>
                    <div className="x-profile__handle">@{p.handle}</div>
                </div>

                {p.bio ? (
                    <div className="x-profile__bio">
                        <RichText text={p.bio} />
                    </div>
                ) : null}

                <div className="x-profile__stats">
                    <button
                        onClick={() =>
                            nav.openFollowList({
                                target: { id: p.id, handle: p.handle },
                                tab: 'following',
                                isSelf: p.isMe,
                            })
                        }
                    >
                        <b>{fmtCount(p.followingCount)}</b> {t('x.followingLc')}
                    </button>
                    <button
                        onClick={() =>
                            nav.openFollowList({
                                target: { id: p.id, handle: p.handle },
                                tab: 'followers',
                                isSelf: p.isMe,
                            })
                        }
                    >
                        <b>{fmtCount(followers)}</b> {t('x.followersLc')}
                    </button>
                </div>

                <div className="x-tabs">
                    {['posts', 'reposts', 'replies', 'media'].map((k) => (
                        <button
                            key={k}
                            className={`x-tab${tab === k ? ' is-on' : ''}`}
                            onClick={() => setTab(k)}
                        >
                            {t(`x.tab_${k}`)}
                            {tab === k && <span className="x-tab__ind" />}
                        </button>
                    ))}
                </div>

                <div className="x-list">
                    {list && list.length > 0 ? (
                        list.map((post, i) => (
                            <PostCard
                                key={`${tab}-${post.id}`}
                                post={post}
                                me={me}
                                onChanged={load}
                                animateIn
                                index={i}
                            />
                        ))
                    ) : (
                        <div className="x-empty x-empty--sm">{t('x.nothingHere')}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
