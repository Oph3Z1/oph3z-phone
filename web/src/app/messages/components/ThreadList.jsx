import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import { ChevronRightIcon, ComposeIcon, CheckIcon } from './icons';
import { deleteThreads } from '../../../store/slices/messagesSlice';

function preview(t) {
  switch (t.lastType) {
    case 'image': return '📷 Photo';
    case 'video': return '📹 Video';
    case 'location': return '📍 Location';
    case 'money': return '💵 Money';
    case 'voice': return '🎤 Voice message';
    default: return t.lastBody || '';
  }
}

function timeLabel(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

export default function ThreadList({ onOpen, onCompose }) {
  const dispatch = useDispatch();
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

  return (
    <div className={`msg${edit ? ' is-editing' : ''}`}>
      <div className="msg-topbar">
        {threads.length > 0 ? (
          <button
            className="msg-topbar__edit"
            onClick={() => (edit ? exitEdit() : setEdit(true))}
          >
            {edit ? 'Done' : 'Edit'}
          </button>
        ) : (
          <span />
        )}
        {!edit && (
          <button className="msg-topbar__compose" onClick={onCompose} aria-label="New message">
            <ComposeIcon />
          </button>
        )}
      </div>

      <div className="msg-scroll">
        <div className="msg-list__title">Messages</div>

        {threads.length === 0 && <div className="msg-empty">No messages yet. Tap ✎ to start.</div>}

        {threads.map((t) => {
          const isSel = selected.has(t.number);
          return (
            <button
              key={t.number}
              className="msg-row"
              onClick={() => (edit ? toggleSelect(t.number) : onOpen(t.number))}
            >
              {edit && (
                <span className={`msg-sel${isSel ? ' is-on' : ''}`}>{isSel && <CheckIcon />}</span>
              )}
              {!edit && <span className={`msg-row__dot${t.unread > 0 ? ' is-on' : ''}`} />}
              <Avatar name={t.name} src={t.avatar} />
              <div className="msg-row__body">
                <div className="msg-row__top">
                  <span className="msg-row__name">{t.name}</span>
                  <span className="msg-row__time">{timeLabel(t.lastTs)}</span>
                  {!edit && <ChevronRightIcon className="msg-row__chev" />}
                </div>
                <div className={`msg-row__prev${t.unread > 0 ? ' is-unread' : ''}`}>{preview(t)}</div>
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
            Delete{selected.size ? ` (${selected.size})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
