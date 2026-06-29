const PayMark = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm2 1v2h14V8H5zm0 5v4h14v-4H5z" />
  </svg>
);

// A single message bubble: text, money (Apple-Pay style), and money requests.
export default function Bubble({ msg, onPay }) {
  const out = msg.dir === 'out';
  const amt = (msg.meta && msg.meta.amount) || Number(msg.body) || 0;

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
    return (
      <div className={`msg-brow ${out ? 'is-out' : 'is-in'}`}>
        <div className="msg-cashmsg">
          <div className="msg-cashmsg__card is-request">
            <div className="msg-cashmsg__hdr">
              <PayMark /> Pay
            </div>
            <div className="msg-cashmsg__amt">${Number(amt).toLocaleString()}</div>
            <div className="msg-cashmsg__req">{out ? 'Requested' : 'Requested from you'}</div>
            {!out && (
              <button className="msg-cashmsg__pay" onClick={() => onPay && onPay(amt)}>
                Pay
              </button>
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
