import { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { PlusIcon, SearchIcon } from '../components/icons';
import { openShare } from '../../../store/slices/airdropSlice';
import { useT } from '../../../i18n/useT';

const ShareGlyph = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M12 3v12M12 3L8 7M12 3l4 4" />
        <path d="M5 12v7h14v-7" />
    </svg>
);

function groupContacts(contacts) {
    const sorted = [...contacts].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    const groups = {};
    for (const c of sorted) {
        const first = (c.name.trim()[0] || '#').toUpperCase();
        const key = /[A-ZÅÄÖ]/.test(first) ? first : '#';
        (groups[key] = groups[key] || []).push(c);
    }
    return Object.keys(groups)
        .sort()
        .map((letter) => ({ letter, items: groups[letter] }));
}

export default function ContactsView({ onOpen, onAdd }) {
    const t = useT();
    const dispatch = useDispatch();
    const contacts = useSelector((s) => s.contacts.contacts);
    const myNumber = useSelector((s) => s.contacts.number);
    const identity = useSelector((s) => s.phone.identity);
    const [query, setQuery] = useState('');

    const shareMyCard = () =>
        dispatch(
            openShare({
                kind: 'contact',
                contact: {
                    name: identity.name || t('phone.myCard'),
                    number: myNumber,
                    img: identity.avatar,
                },
            }),
        );

    const sectionRefs = useRef({});

    const sections = useMemo(() => groupContacts(contacts), [contacts]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return null;
        return contacts.filter(
            (c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q),
        );
    }, [query, contacts]);

    const scrollTo = (letter) => {
        sectionRefs.current[letter]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };

    const Row = (c) => (
        <button key={c.id} className="pa-row" onClick={() => onOpen(c.id)}>
            <Avatar name={c.name} img={c.img} />
            <span className="pa-row__main">
                <span className="pa-row__name">{c.name}</span>
            </span>
        </button>
    );

    return (
        <>
            <div className="pa-topbar">
                <span />
                <button className="pa-actionbtn pa-actionbtn--round" onClick={onAdd}>
                    <PlusIcon />
                </button>
            </div>
            <div className="pa-title">{t('phone.contacts')}</div>

            <div className="pa-search">
                <SearchIcon />
                <input
                    placeholder={t('phone.search')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="pa-mycard">
                <Avatar name={identity.name || ''} img={identity.avatar || ''} size="3.2em" />
                <span className="pa-row__main">
                    <span className="pa-mycard__name">{identity.name || t('phone.myCard')}</span>
                    <span className="pa-mycard__sub">{myNumber || '—'}</span>
                </span>
                <button
                    className="pa-mycard__share"
                    onClick={shareMyCard}
                    aria-label="Share my contact"
                >
                    <ShareGlyph />
                </button>
            </div>

            <div className="pa-scroll">
                {filtered ? (
                    <div className="pa-list">
                        {filtered.length === 0 ? (
                            <div className="pa-empty">
                                <div className="pa-empty__title">{t('phone.noResults')}</div>
                            </div>
                        ) : (
                            filtered.map(Row)
                        )}
                    </div>
                ) : (
                    <div className="pa-list">
                        {sections.map((sec) => (
                            <div
                                key={sec.letter}
                                ref={(el) => (sectionRefs.current[sec.letter] = el)}
                            >
                                <div className="pa-section">{sec.letter}</div>
                                {sec.items.map(Row)}
                            </div>
                        ))}
                        {contacts.length === 0 && (
                            <div className="pa-empty">
                                <div className="pa-empty__title">{t('phone.noContacts')}</div>
                                <div>{t('phone.noContactsHint')}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!filtered && sections.length > 0 && (
                <div className="pa-azindex">
                    {sections.map((sec) => (
                        <button key={sec.letter} onClick={() => scrollTo(sec.letter)}>
                            {sec.letter}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}