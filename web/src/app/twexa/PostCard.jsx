import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { openDialog } from '../../store/slices/dialogSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { copyText } from '../../utils/clipboard';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import { timeAgo, fmtCount } from './xUtil';
import Avatar from './Avatar';
import RichText from './RichText';
import MediaGrid from './MediaGrid';
import {
    ReplyIcon,
    RepostIcon,
    HeartIcon,
    MoreIcon,
    RepostIcon as RepostSmall,
    Verified,
} from './icons';

export default function PostCard({ post, me, onChanged, big = false }) {
    const dispatch = useDispatch();
    const t = useT();
    const nav = useXNav();

    const [liked, setLiked] = useState(post.liked);
    const [likeCount, setLikeCount] = useState(post.likeCount);
    const [reposted, setReposted] = useState(post.reposted);
    const [repostCount, setRepostCount] = useState(post.repostCount);
    const [menu, setMenu] = useState(false);

    useEffect(() => {
        setLiked(post.liked);
        setLikeCount(post.likeCount);
        setReposted(post.reposted);
        setRepostCount(post.repostCount);
    }, [post.id, post.liked, post.likeCount, post.reposted, post.repostCount]);

    const author = post.author || {};
    const mine = me && author && String(author.id) === String(me.id);

    const toggleLike = async (e) => {
        e.stopPropagation();
        const next = !liked;
        setLiked(next);
        setLikeCount((c) => c + (next ? 1 : -1));
        const res = await fetchNui(
            'phone:x:like',
            { id: post.id },
            { ok: true, liked: next, likeCount: likeCount + (next ? 1 : -1) },
        );
        if (res && res.ok) {
            setLiked(res.liked);
            setLikeCount(res.likeCount);
        }
    };

    const toggleRepost = async (e) => {
        e.stopPropagation();
        const next = !reposted;
        setReposted(next);
        setRepostCount((c) => c + (next ? 1 : -1));
        const res = await fetchNui(
            'phone:x:repost',
            { id: post.id },
            { ok: true, reposted: next, repostCount: repostCount + (next ? 1 : -1) },
        );
        if (res && res.ok) {
            setReposted(res.reposted);
            setRepostCount(res.repostCount);
        }
    };

    const doCopy = async () => {
        setMenu(false);
        await copyText(post.text || '');
        dispatch(pushToast({ title: t('x.copied'), body: '' }));
    };

    const doDelete = async () => {
        setMenu(false);
        const ok = await dispatch(
            openDialog({
                title: t('x.deletePostTitle'),
                message: t('x.deletePostMsg'),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('common.delete'), style: 'destructive', value: true },
                ],
            }),
        );
        if (!ok) return;
        await fetchNui('phone:x:delete', { id: post.id }, { ok: true });
        dispatch(pushToast({ title: t('x.postDeleted'), body: '' }));
        onChanged && onChanged();
    };

    const openDetail = () => nav.openPost && nav.openPost(post.id);
    const openAuthor = (ev) => {
        ev.stopPropagation();
        nav.openProfile && nav.openProfile({ id: author.id, handle: author.handle });
    };

    return (
        <article className={`x-post${big ? ' x-post--big' : ''}`} onClick={openDetail}>
            {post.repostBy && (
                <div className="x-post__repost">
                    <RepostSmall size={13} />
                    <span>
                        {post.repostBy.name} {t('x.reposted')}
                    </span>
                </div>
            )}

            <div className="x-post__body">
                {!big && (
                    <Avatar
                        account={author}
                        size="2.6em"
                        onClick={() =>
                            nav.openProfile &&
                            nav.openProfile({ id: author.id, handle: author.handle })
                        }
                    />
                )}

                <div className="x-post__main">
                    <div className="x-post__head">
                        {big && (
                            <Avatar
                                account={author}
                                size="2.6em"
                                onClick={() =>
                                    nav.openProfile &&
                                    nav.openProfile({ id: author.id, handle: author.handle })
                                }
                                className="x-post__bigav"
                            />
                        )}
                        <div
                            className={`x-post__names${big ? ' x-post__names--stack' : ''}`}
                            onClick={openAuthor}
                        >
                            <span className="x-post__name">
                                {author.name}
                                <Verified tier={author.badge} />
                            </span>
                            <span className="x-post__handle">@{author.handle}</span>
                            {!big && (
                                <>
                                    <span className="x-post__dot">·</span>
                                    <span className="x-post__time">{timeAgo(post.createdAt)}</span>
                                </>
                            )}
                        </div>
                        <button
                            className="x-post__more"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenu(true);
                            }}
                            aria-label="More"
                        >
                            <MoreIcon size={16} />
                        </button>
                    </div>

                    {post.text ? (
                        <div className="x-post__text">
                            <RichText text={post.text} />
                        </div>
                    ) : null}
                    <MediaGrid media={post.media} />

                    <div className="x-post__actions" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="x-act x-act--reply"
                            onClick={() => nav.openCompose && nav.openCompose({ replyTo: post })}
                        >
                            <ReplyIcon />
                            <span>{post.replyCount ? fmtCount(post.replyCount) : ''}</span>
                        </button>
                        <button
                            className={`x-act x-act--repost${reposted ? ' is-on' : ''}`}
                            onClick={toggleRepost}
                        >
                            <RepostIcon active={reposted} />
                            <span>{repostCount ? fmtCount(repostCount) : ''}</span>
                        </button>
                        <button
                            className={`x-act x-act--like${liked ? ' is-on' : ''}`}
                            onClick={toggleLike}
                        >
                            <HeartIcon active={liked} />
                            <span>{likeCount ? fmtCount(likeCount) : ''}</span>
                        </button>
                    </div>
                </div>
            </div>

            {menu && (
                <div
                    className="x-sheet"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenu(false);
                    }}
                >
                    <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="x-sheet__actions x-sheet__actions--col">
                            <button className="x-sheet__btn" onClick={doCopy}>
                                {t('x.copyText')}
                            </button>
                            {mine && (
                                <button
                                    className="x-sheet__btn x-sheet__btn--danger"
                                    onClick={doDelete}
                                >
                                    {t('x.deletePost')}
                                </button>
                            )}
                            <button className="x-sheet__btn" onClick={() => setMenu(false)}>
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}