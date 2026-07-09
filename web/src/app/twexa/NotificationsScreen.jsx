import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import { timeAgo } from './xUtil';
import Avatar from './Avatar';
import { BackArrow, HeartIcon, RepostIcon, ReplyIcon, ProfileIcon, Verified } from './icons';

const TYPE_ICON = {
    like: <HeartIcon size={16} active />,
    repost: <RepostIcon size={16} active />,
    reply: <ReplyIcon size={16} />,
    mention: <ReplyIcon size={16} />,
    follow: <ProfileIcon size={16} />,
};

export default function NotificationsScreen({ onBack }) {
    const t = useT();
    const nav = useXNav();
    const liveTick = useSelector((s) => s.x.liveTick);
    const [items, setItems] = useState(null);

    useEffect(() => {
        fetchNui('phone:x:notifs', {}, { ok: true, items: [] }).then(
            (r) => r && r.ok && setItems(r.items || []),
        );
    }, [liveTick]);

    const open = (n) => {
        if (
            n.postId &&
            (n.type === 'like' || n.type === 'reply' || n.type === 'repost' || n.type === 'mention')
        ) {
            nav.openPost(n.postId);
        } else if (n.actor) {
            nav.openProfile({ id: n.actor.id, handle: n.actor.handle });
        }
    };

    return (
        <div className="x-screen">
            <div className="x-topbar">
                <button className="x-iconbtn" onClick={onBack}>
                    <BackArrow />
                </button>
                <span className="x-topbar__title">{t('x.notifications')}</span>
                <span className="x-topbar__spacer" />
            </div>
            <div className="x-scroll">
                {items === null ? (
                    <div className="x-empty">{t('x.loading')}</div>
                ) : items.length === 0 ? (
                    <div className="x-empty x-empty--sm">{t('x.noNotifs')}</div>
                ) : (
                    items.map((n) => (
                        <button
                            key={n.id}
                            className={`x-notif${n.read ? '' : ' is-unread'}`}
                            onClick={() => open(n)}
                        >
                            <span className={`x-notif__ico x-notif__ico--${n.type}`}>
                                {TYPE_ICON[n.type] || TYPE_ICON.like}
                            </span>
                            <Avatar account={n.actor} size="2.2em" />
                            <span className="x-notif__text">
                                <b>{n.actor ? n.actor.name : t('x.someone')}</b>
                                {n.actor && <Verified size={13} tier={n.actor.badge} />}{' '}
                                {t(`x.verb_${n.type}`) || n.verb}
                                <span className="x-notif__time"> · {timeAgo(n.ts)}</span>
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}