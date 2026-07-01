const COLORS = ['#ff9500', '#ff2d55', '#5856d6', '#34c759', '#0a84ff', '#af52de', '#ff375f'];

function colorFor(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

const PeopleGlyph = () => (
  <svg width="58%" height="58%" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8.5 11a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6 3 3 0 000 6zM8.5 13c-2.7 0-5.5 1.4-5.5 3.6V19h11v-2.4C14 14.4 11.2 13 8.5 13zm7 0c-.5 0-1 .05-1.5.13 1.3.9 2 2.1 2 3.47V19h5v-2.4c0-2.2-2.8-3.6-5.5-3.6z" />
  </svg>
);

// Group avatar: custom photo if set, else a colored circle with a people glyph.
// Works for both compact thread rows and the conversation header.
export default function GroupAvatar({ group, className = '' }) {
  const photo = group?.photo;
  const name = group?.name || 'Group';
  return (
    <div
      className={`msg-avatar gmsg-gavatar ${className}`}
      style={photo ? undefined : { background: colorFor(name), color: '#fff' }}
    >
      {photo ? <img src={photo} alt="" /> : <PeopleGlyph />}
    </div>
  );
}
