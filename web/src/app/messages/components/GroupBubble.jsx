import { useRef, useState } from 'react';
import Avatar from './Avatar';
import { BubbleContent } from './Bubble';

const REACTIONS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

// Collapse a { number: emoji } map into [{ emoji, count }] for display.
function summarize(reactions) {
  const counts = {};
  Object.values(reactions || {}).forEach((e) => {
    if (e) counts[e] = (counts[e] || 0) + 1;
  });
  return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
}

export default function GroupBubble({ msg, showName, selfNumber, onReact, onOpenMedia, onOpenLocation, onStopLive }) {
  // Trust our own number over the server's flag, so others' messages always land
  // on the left (with name + avatar) and ours stay plain on the right.
  const out = msg.from && selfNumber ? msg.from === selfNumber : !!msg.mine;
  const [picker, setPicker] = useState(false);
  const holdTimer = useRef(null);

  if (msg.type === 'system') {
    return <div className="gmsg-sys">{msg.body}</div>;
  }

  // Press-and-hold opens the reaction picker (so a normal tap still opens media).
  const startHold = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setPicker(true), 420);
  };
  const cancelHold = () => clearTimeout(holdTimer.current);

  const pick = (emoji) => {
    onReact && onReact(msg.id, emoji);
    setPicker(false);
  };

  const reactions = summarize(msg.reactions);

  return (
    <div className={`gmsg ${out ? 'is-out' : 'is-in'}`}>
      {!out && <Avatar name={msg.senderName} src={msg.senderAvatar} className="msg-avatar--sm gmsg__avatar" />}

      <div className="gmsg__col">
        {!out && showName && <div className="gmsg__name">{msg.senderName}</div>}

        <div
          className="gmsg__hold"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerMove={cancelHold}
        >
          <BubbleContent
            msg={msg}
            out={out}
            onOpenMedia={onOpenMedia}
            onOpenLocation={onOpenLocation}
            onStopLive={onStopLive}
          />

          {reactions.length > 0 && (
            <div className={`gmsg__reacts ${out ? 'is-out' : 'is-in'}`}>
              {reactions.map((r) => (
                <span key={r.emoji} className="gmsg__react">
                  {r.emoji}
                  {r.count > 1 && <b>{r.count}</b>}
                </span>
              ))}
            </div>
          )}

          {picker && (
            <>
              <div className="gmsg__pickdim" onPointerDown={() => setPicker(false)} />
              <div className={`gmsg__picker ${out ? 'is-out' : 'is-in'}`}>
                {REACTIONS.map((e) => (
                  <button key={e} className="gmsg__pickbtn" onClick={() => pick(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
