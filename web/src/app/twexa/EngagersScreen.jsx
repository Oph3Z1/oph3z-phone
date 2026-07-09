import { useEffect, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { BackArrow } from './icons';
import { UserRow } from './FollowListScreen';

export default function EngagersScreen({ postId, initialTab, onBack }) {
    const t = useT();
    const [tab, setTab] = useState(initialTab || 'reposts');
    const [items, setItems] = useState(null);

    useEffect(() => {
        let alive = true;
        setItems(null);
        fetchNui(
            'phone:x:postEngagers',
            { id: postId, type: tab },
            { ok: true, accounts: [] },
        ).then((r) => {
            if (alive && r && r.ok) setItems(r.accounts || []);
        });
        return () => {
            alive = false;
        };
    }, [tab, postId]);

    return (
        <div className="x-screen">
            <div className="x-topbar">
                <button className="x-iconbtn" onClick={onBack}>
                    <BackArrow />
                </button>
                <div className="x-topbar__stack">
                    <span className="x-topbar__title">{t('x.engagementTitle')}</span>
                </div>
                <span className="x-topbar__spacer" />
            </div>

            <div className="x-tabs">
                {['reposts', 'likes'].map((k) => (
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

            <div className="x-scroll">
                {items === null ? (
                    <div className="x-empty">{t('x.loading')}</div>
                ) : items.length === 0 ? (
                    <div className="x-empty x-empty--sm">
                        {tab === 'reposts' ? t('x.noReposts') : t('x.noLikes')}
                    </div>
                ) : (
                    items.map((a) => <UserRow key={a.id} acc={a} />)
                )}
            </div>
        </div>
    );
}