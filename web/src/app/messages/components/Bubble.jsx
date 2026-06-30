import LocationCard from './LocationCard';
import VoiceBubble from './VoiceBubble';

const PayMark = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm2 1v2h14V8H5zm0 5v4h14v-4H5z" />
  </svg>
);

// A message bubble: text, money (Apple-Pay style), and money requests/offers.
export default function Bubble({ msg, selfNumber, onSettle, onDecline, onOpenMedia, onOpenLocation, onStopLive }) {
  const out = msg.dir === 'out';
  const amt = (msg.meta && msg.meta.amount) || Number(msg.body) || 0;

  if (msg.type === 'location') {
    return (
      <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
        <LocationCard msg={msg} out={out} onOpen={onOpenLocation} onStopLive={onStopLive} />
      </div>
    );
  }

  if (msg.type === 'voice') {
    return (
      <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
        <VoiceBubble msg={msg} out={out} />
      </div>
    );
  }

  if (msg.type === 'image' || msg.type === 'video') {
    return (
      <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
        <button
          className={`msg-media${msg.pending ? ' is-pending' : ''}`}
          onClick={() => onOpenMedia && onOpenMedia(msg)}
        >
          {msg.type === 'video' ? (
            <>
              <video className="msg-media__el" src={msg.body} muted playsInline preload="metadata" />
              <span className="msg-media__play">▶</span>
            </>
          ) : (
            <img className="msg-media__el" src={msg.body} alt="" />
          )}
        </button>
      </div>
    );
  }

  if (msg.type === 'money') {
    return (
      <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
        <div className="msg-cashmsg">
          <div className={`msg-cashmsg__card${msg.pending ? ' is-pending' : ''}`}>
            <div className="msg-cashmsg__hdr">
              <PayMark /> Pay
            </div>
            <div className="msg-cashmsg__amt">${Number(amt).toLocaleString()}</div>
          </div>
          <div className="msg-cashmsg__status">{out ? 'Sent' : 'Received'}</div>
        </div>
      </div>
    );
  }

  if (msg.type === 'request') {
    const status = (msg.meta && msg.meta.status) || 'pending';
    const iPay = msg.meta && msg.meta.payer === selfNumber; // me = the one who pays
    const done = status === 'paid' || status === 'declined';
    const showBtns = status === 'pending' && !out; // their turn -> shown on the receiver
    const sub =
      status === 'paid'
        ? 'Paid'
        : status === 'declined'
        ? 'Declined'
        : out
        ? 'Pending'
        : iPay
        ? 'Requested from you'
        : 'Offering you';

    return (
      <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
        <div className="msg-cashmsg">
          <div className={`msg-cashmsg__card is-request${done ? ' is-done' : ''}`}>
            <div className="msg-cashmsg__hdr">
              <PayMark /> Pay
            </div>
            <div className="msg-cashmsg__amt">${Number(amt).toLocaleString()}</div>
            <div className="msg-cashmsg__req">{sub}</div>
            {showBtns && (
              <div className="msg-cashmsg__btns">
                <button
                  className="msg-cashmsg__btn msg-cashmsg__btn--pay"
                  onClick={() => onSettle && onSettle(msg.id)}
                >
                  {iPay ? 'Pay' : 'Accept'}
                </button>
                <button
                  className="msg-cashmsg__btn msg-cashmsg__btn--decline"
                  onClick={() => onDecline && onDecline(msg.id)}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
      <div className={`msg-bubble ${out ? 'is-out' : 'is-in'}${msg.pending ? ' is-pending' : ''}`}>
        {linkify(msg.body)}
      </div>
    </div>
  );
}

function linkify(text) {
  if (!text) return null;
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noreferrer" className="msg-link">
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
