import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { digitsOf } from '../../../store/slices/contactsSlice';
import { sendMessage } from '../../../store/slices/messagesSlice';
import Avatar from './Avatar';
import MessageInput from './MessageInput';
import { useT } from '../../../i18n/useT';

export default function NewMessage({ onClose, onOpen }) {
    const dispatch = useDispatch();
    const tr = useT();
    const contacts = useSelector((s) => s.contacts.contacts);

    const [query, setQuery] = useState('');
    const [recipient, setRecipient] = useState(null);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const qd = digitsOf(query);
        return contacts
            .filter(
                (c) => c.name.toLowerCase().includes(q) || (qd && digitsOf(c.number).includes(qd)),
            )
            .slice(0, 6);
    }, [query, contacts]);

    const pick = (c) => {
        setRecipient({ number: digitsOf(c.number), name: c.name });
        setQuery('');
    };
    const pickTyped = () => {
        const d = digitsOf(query);
        if (d.length >= 3) {
            setRecipient({ number: d, name: null });
            setQuery('');
        }
    };

    const send = (text) => {
        if (!recipient) return;
        const body = text.trim();
        if (!body) return;
        dispatch(sendMessage(recipient.number, { type: 'text', body }));
        onOpen(recipient.number);
    };

    return (
        <div className="msg msg--new">
            <div className="msg-new__bar">
                <span className="msg-new__title">{tr('messages.newMessage')}</span>
                <button className="msg-new__cancel" onClick={onClose}>
                    {tr('messages.cancel')}
                </button>
            </div>

            <div className="msg-new__to">
                <span className="msg-new__tolabel">{tr('messages.to')}</span>
                {recipient ? (
                    <span className="msg-new__chip">
                        {recipient.name || recipient.number}
                        <button onClick={() => setRecipient(null)} aria-label="Remove">
                            ✕
                        </button>
                    </span>
                ) : (
                    <input
                        className="msg-new__toinput"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') pickTyped();
                        }}
                        autoFocus
                    />
                )}
            </div>

            {!recipient && suggestions.length > 0 && (
                <div className="msg-new__suggest">
                    {suggestions.map((c) => (
                        <button key={c.id} className="msg-new__sug" onClick={() => pick(c)}>
                            <Avatar name={c.name} src={c.img} className="msg-avatar--sm" />
                            <div className="msg-new__sugtext">
                                <div className="msg-new__sugname">{c.name}</div>
                                <div className="msg-new__sugnum">{c.number}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="msg-new__spacer" />

            <MessageInput onSend={send} />
        </div>
    );
}