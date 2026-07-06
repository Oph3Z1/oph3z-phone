// Seller avatar: the Settings profile photo, or a coloured initial as a fallback.
// The tint is derived from the name so each seller gets a stable colour.
const TINTS = ['#f5b301', '#e6863c', '#d98324', '#caa63d', '#b98b2e', '#e0a92b'];

export default function Avatar({ account, size = '2.6em', onClick }) {
  const a = account || {};
  const initial = (a.name || '?').trim().charAt(0).toUpperCase() || '?';
  const tint = TINTS[(initial.charCodeAt(0) || 0) % TINTS.length];
  const style = { width: size, height: size };
  return (
    <span className={`mkt-av${onClick ? ' is-tappable' : ''}`} style={style} onClick={onClick}>
      {a.avatar ? (
        <img src={a.avatar} alt="" />
      ) : (
        <span className="mkt-av__ph" style={{ background: tint }}>{initial}</span>
      )}
    </span>
  );
}
