// Shared AirDrop bits: the concentric-arc glyph, the "what" description, and a
// preview thumbnail used by the island / picker / notification cards.

// The AirDrop icon as an app-style rounded blue tile (data URI) so it can be used
// as a toast / notification icon (those render an <img>, not an SVG component).
export const AIRDROP_TOAST_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<rect width='24' height='24' rx='5.4' fill='#0a84ff'/>" +
      "<g fill='none' stroke='#fff' stroke-width='1.7' stroke-linecap='round'>" +
      "<path d='M9 19.6A7.6 7.6 0 1 1 15 19.6'/>" +
      "<path d='M10.2 16.9A4.8 4.8 0 1 1 13.8 16.9'/>" +
      "<path d='M11.3 14.3A2.3 2.3 0 1 1 12.7 14.3'/>" +
      "</g>" +
      "<circle cx='12' cy='12.2' r='1.3' fill='#fff'/>" +
      '</svg>'
  );

export const AirDropGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="1em" height="1em" {...props}>
    <path d="M8.9 21A9 9 0 1 1 15.1 21" />
    <path d="M10.05 17.86A5.7 5.7 0 1 1 13.95 17.86" />
    <path d="M11.11 14.94A2.6 2.6 0 1 1 12.89 14.94" />
    <circle cx="12" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const ContactGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0z" />
  </svg>
);

// The "<name> would like to share <what>." body line.
export function describeAirdrop(transfer, t) {
  const kind = transfer.kind;
  let what = '';
  if (kind === 'contact') what = t('airdrop.whatContact');
  else if (kind === 'photos') {
    const n = transfer.photos ? transfer.photos.length : 1;
    what = n === 1 ? t('airdrop.whatOnePhoto') : t('airdrop.whatPhotos', { count: n });
  } else if (kind === 'app') {
    what = t('airdrop.whatApp', { app: (transfer.app && transfer.app.title) || 'app' });
  }
  return t('airdrop.wants', { name: transfer.from ? transfer.from.name : '', what });
}

// The right-side preview thumbnail for a transfer.
export function AirdropPreview({ transfer, className = '' }) {
  const src = transfer.preview;
  if (src) return <span className={`ad-preview ${className}`}><img src={src} alt="" /></span>;
  return (
    <span className={`ad-preview ad-preview--glyph ${className}`}>
      {transfer.kind === 'contact' ? <ContactGlyph /> : <AirDropGlyph />}
    </span>
  );
}
