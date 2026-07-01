import { useState } from 'react';
import { CameraIcon, PlusIcon, MicIcon, SendIcon, GifIcon } from './icons';

// Bottom composer bar. Camera/+ (attachments), GIF picker and mic (voice).
export default function MessageInput({ onSend, onCamera, onPlus, onGif, onMic, attachment, onRemoveAttachment }) {
  const [text, setText] = useState('');
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

  return (
    <div className="msg-input-wrap">
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
        <button className="msg-input__round" onClick={onCamera} aria-label="Camera">
          <CameraIcon />
        </button>
        <button className="msg-input__round" onClick={onPlus} aria-label="Attach">
          <PlusIcon />
        </button>

        <div className="msg-input__field">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={attachment ? 'Add a comment' : 'Text Message'}
          />
          {canSend ? (
            <button className="msg-input__send" onClick={submit} aria-label="Send">
              <SendIcon />
            </button>
          ) : (
            <>
              {onGif && (
                <button className="msg-input__gif" onClick={onGif} aria-label="GIF">
                  <GifIcon />
                </button>
              )}
              <button className="msg-input__mic" onClick={onMic} aria-label="Voice message">
                <MicIcon />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
