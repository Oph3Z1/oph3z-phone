import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Avatar from './Avatar';
import { useT } from '../../../i18n/useT';

export default function ContactPicker({ title, onPick, onClose }) {
    const t = useT();
    const contacts = useSelector((s) => s.contacts.contacts);
    const [q, setQ] = useState('');

    const list = useMemo(() => {
        const sorted = [...contacts].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        const query = q.trim().toLowerCase();
        if (!query) return sorted;
        return sorted.filter(
            (c) => c.name.toLowerCase().includes(query) || (c.number || '').includes(query),
        );
    }, [contacts, q]);

    return (
        <>
            <div className="msg-cash-backdrop" onClick={onClose} />
            <div className="msg-cpick">
                <button className="msg-cash__grab" onClick={onClose} aria-label="Close" />
                <div className="msg-cpick__title">{title || t('phone.contacts')}</div>
                <input
                    className="msg-cpick__search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t('phone.search')}
                />
                <div className="msg-cpick__list">
                    {list.length === 0 && (
                        <div className="msg-cpick__empty">{t('phone.noContacts')}</div>
                    )}
                    {list.map((c) => (
                        <button key={c.id} className="msg-cpick__row" onClick={() => onPick(c)}>
                            <Avatar name={c.name} src={c.img} className="msg-avatar--md" />
                            <div className="msg-cpick__info">
                                <div className="msg-cpick__name">{c.name}</div>
                                <div className="msg-cpick__num">{c.number}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}