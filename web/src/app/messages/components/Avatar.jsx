const COLORS = ['#ff9500', '#ff2d55', '#5856d6', '#34c759', '#0a84ff', '#af52de', '#ff375f'];

function colorFor(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

// Contact avatar: photo if set, else a colored circle with the first letter.
export default function Avatar({ name, src, className = '' }) {
  const letter = ((name || '?').trim().charAt(0) || '?').toUpperCase();
  return (
    <div className={`msg-avatar ${className}`} style={src ? undefined : { background: colorFor(name) }}>
      {src ? <img src={src} alt="" /> : <span>{letter}</span>}
    </div>
  );
}
