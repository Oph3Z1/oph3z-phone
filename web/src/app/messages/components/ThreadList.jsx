import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import GroupAvatar from './GroupAvatar';
import { ChevronRightIcon, ComposeIcon, CheckIcon, GroupAddIcon } from './icons';
import { deleteThreads } from '../../../store/slices/messagesSlice';
import { useT } from '../../../i18n/useT';

function preview(t, tr) {
    if (t.isGroup) {
        const who = t.lastDir === 'out' ? tr('messages.you') : t.lastSender;
        const body = mediaLabel(t, tr) ?? t.lastBody ?? '';
        if (t.lastType === 'system') return body;
        return who ? `${who}: ${body}` : body;
    }
    return mediaLabel(t, tr) ?? t.lastBody ?? '';
}

function mediaLabel(t, tr) {
    switch (t.lastType) {
        case 'image':
            return tr('messages.photo');
        case 'video':
            return tr('messages.video');
        case 'gif':
            return tr('messages.gif');
        case 'location':
            return tr('messages.location');
        case 'money':
            return tr('messages.money');
        case 'voice':
            return tr('messages.voice');
        default:
            return null;
    }
}

function timeLabel(ts, tr) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return tr('messages.yesterday');
    return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

export default function ThreadList({ onOpen, onCompose, onNewGroup }) {
    const dispatch = useDispatch();
    const tr = useT();
    const threads = useSelector((s) => s.messages.threads);

    const [edit, setEdit] = useState(false);
    const [selected, setSelected] = useState(() => new Set());

    const toggleSelect = (number) =>
        setSelected((prev) => {
            const n = new Set(prev);
            n.has(number) ? n.delete(number) : n.add(number);
            return n;
        });

    const exitEdit = () => {
        setEdit(false);
        setSelected(new Set());
    };

    const removeSelected = () => {
        if (selected.size) dispatch(deleteThreads([...selected]));
        exitEdit();
    };

    const keyOf = (t) => (t.isGroup ? `g:${t.gid}` : t.number);

    return (
        <div className={`msg${edit ? ' is-editing' : ''}`}>
            <div className="msg-topbar">
                {threads.length > 0 ? (
                    <button
                        className="msg-topbar__edit"
                        onClick={() => (edit ? exitEdit() : setEdit(true))}
                    >
                        {edit ? tr('messages.done') : tr('messages.edit')}
                    </button>
                ) : (
                    <span />
                )}
                {!edit && (
                    <div className="msg-topbar__actions">
                        <button
                            className="msg-topbar__compose"
                            onClick={onNewGroup}
                            aria-label="New group"
                        >
                            <GroupAddIcon />
                        </button>
                        <button
                            className="msg-topbar__compose"
                            onClick={onCompose}
                            aria-label="New message"
                        >
                            <ComposeIcon />
                        </button>
                    </div>
                )}
            </div>

            <div className="msg-scroll">
                <div className="msg-list__title">{tr('messages.title')}</div>

                {threads.length === 0 && <div className="msg-empty">{tr('messages.empty')}</div>}

                {threads.map((t) => {
                    const selectable = edit && !t.isGroup;
                    const isSel = selected.has(t.number);
                    return (
                        <button
                            key={keyOf(t)}
                            className="msg-row"
                            onClick={() =>
                                selectable ? toggleSelect(t.number) : edit ? null : onOpen(t)
                            }
                        >
                            {edit && (
                                <span
                                    className={`msg-sel${isSel ? ' is-on' : ''}${t.isGroup ? ' is-disabled' : ''}`}
                                >
                                    {isSel && <CheckIcon />}
                                </span>
                            )}
                            {!edit && (
                                <span className={`msg-row__dot${t.unread > 0 ? ' is-on' : ''}`} />
                            )}
                            {t.isGroup ? (
                                <GroupAvatar group={t} />
                            ) : (
                                <Avatar name={t.name} src={t.avatar} />
                            )}
                            <div className="msg-row__body">
                                <div className="msg-row__top">
                                    <span className="msg-row__name">{t.name}</span>
                                    <span className="msg-row__time">{timeLabel(t.lastTs, tr)}</span>
                                    {!edit && <ChevronRightIcon className="msg-row__chev" />}
                                </div>
                                <div className={`msg-row__prev${t.unread > 0 ? ' is-unread' : ''}`}>
                                    {preview(t, tr)}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {edit && (
                <div className="msg-deletebar">
                    <button
                        className="msg-deletebar__btn"
                        disabled={selected.size === 0}
                        onClick={removeSelected}
                    >
                        {tr('messages.delete')}
                        {selected.size ? ` (${selected.size})` : ''}
                    </button>
                </div>
            )}
        </div>
    );
}