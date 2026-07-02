import { useState } from 'react';
import { PlusIcon, MicIcon, SendIcon, EmojiIcon } from './icons';
import EmojiPicker from './EmojiPicker';

// Bottom composer bar: [ + ] · [ input with emoji + mic inside ] · [ Send ].
// Camera / Gallery / GIF / Money / Location live in the + menu now.
export default function MessageInput({ onSend, onPlus, onMic, attachment, onRemoveAttachment }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const hasText = text.trim().length > 0;
  const canSend = hasText || !!attachment;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const insertEmoji = (e) => setText((t) => t + e);

  return (
    <div className={`msg-input-wrap${showEmoji ? ' is-emoji' : ''}`}>
      {attachment && (
        <div className="msg-draft">
          <div className="msg-draft__thumb">
            {attachment.type === 'video' ? (
              <video src={attachment.url} muted />
            ) : (
              <img src={attachment.url} alt="" />
            )}
            <button className="msg-draft__x" onClick={onRemoveAttachment} aria-label="Remove">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="msg-input">
        <button className="msg-input__round" onClick={onPlus} aria-label="Attach">
          <PlusIcon />
        </button>

        <div className="msg-input__field">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={attachment ? 'Add a comment' : 'Send your message…'}
          />
          <button
            className={`msg-input__emoji${showEmoji ? ' is-on' : ''}`}
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Emoji"
          >
            <EmojiIcon />
          </button>
          <button className="msg-input__mic" onClick={onMic} aria-label="Voice message">
            <MicIcon />
          </button>
        </div>

        <button className="msg-input__send-btn" onClick={submit} disabled={!canSend} aria-label="Send">
          <SendIcon />
        </button>
      </div>

      {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
    </div>
  );
}
