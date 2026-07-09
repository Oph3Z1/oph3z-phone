import { useEffect, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import PostCard from './PostCard';
import { BackArrow } from './icons';

export default function TopicScreen({ tag, me, onBack }) {
    const t = useT();
    const [items, setItems] = useState(null);

    const load = async () => {
        const r = await fetchNui('phone:x:topic', { tag }, { ok: true, items: [] });
        if (r && r.ok) setItems(r.items || []);
    };
    useEffect(() => {
        load(); /* eslint-disable-next-line */
    }, [tag]);

    return (
        <div className="x-screen">
            <div className="x-topbar">
                <button className="x-iconbtn" onClick={onBack}>
                    <BackArrow />
                </button>
                <div className="x-topbar__stack">
                    <span className="x-topbar__title">#{tag}</span>
                    <span className="x-topbar__sub">{t('x.topic')}</span>
                </div>
                <span className="x-topbar__spacer" />
            </div>
            <div className="x-scroll">
                {items === null ? (
                    <div className="x-empty">{t('x.loading')}</div>
                ) : items.length === 0 ? (
                    <div className="x-empty x-empty--sm">{t('x.nothingHere')}</div>
                ) : (
                    <div className="x-list">
                        {items.map((p) => (
                            <PostCard key={p.id} post={p} me={me} onChanged={load} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}