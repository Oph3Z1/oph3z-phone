// Icons for the X app. Stroke icons inherit `currentColor`; filled variants used
// for active states (liked heart, reposted).

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const XLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

export const HomeIcon = ({ size = 24, active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
  </svg>
);

export const SearchIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const BellIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const ProfileIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

export const ReplyIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L4 20.5l1.2-4.9A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);

export const RepostIcon = ({ size = 18, active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 2.5 21 6.5l-4 4" />
    <path d="M21 6.5H7a3 3 0 0 0-3 3V12" />
    <path d="M7 21.5 3 17.5l4-4" />
    <path d="M3 17.5h14a3 3 0 0 0 3-3V12" />
  </svg>
);

export const HeartIcon = ({ size = 18, active }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
  </svg>
);

export const ShareIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M12 3v13" />
    <path d="m7 8 5-5 5 5" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
  </svg>
);

export const MoreIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
);

export const TrashIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);

export const CameraIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const ImageIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m21 16-5-5L5 20" />
  </svg>
);

export const GifIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">GIF</text>
  </svg>
);

export const LinkIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M10 13a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 1 0-5.66-5.66L11 6" />
    <path d="M14 11a4 4 0 0 0-5.66 0L5.5 13.83a4 4 0 1 0 5.66 5.66L13 18" />
  </svg>
);

export const EmojiIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14a4 4 0 0 0 7 0" />
    <circle cx="9" cy="10" r="0.6" fill="currentColor" /><circle cx="15" cy="10" r="0.6" fill="currentColor" />
  </svg>
);

export const BackArrow = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
  </svg>
);

export const PlusIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CloseIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const LogoutIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
    <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

// Verified badge. tier 'blue' (automatic for everyone) or 'gold' (company,
// admin-granted). Only the seal colour changes; the check stays white.
export const Verified = ({ size = 15, tier = 'blue' }) => {
  const seal = tier === 'gold' ? '#f5b301' : '#1d9bf0';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={`x-verified${tier === 'gold' ? ' x-verified--gold' : ''}`}>
      <path fill={seal} d="M22.5 12c0-1.3-.8-2.5-2-3 .3-1.3-.1-2.7-1.1-3.6-1-1-2.3-1.4-3.6-1.1-.5-1.2-1.7-2-3-2s-2.5.8-3 2c-1.3-.3-2.7.1-3.6 1.1-1 1-1.4 2.3-1.1 3.6-1.2.5-2 1.7-2 3s.8 2.5 2 3c-.3 1.3.1 2.7 1.1 3.6 1 1 2.3 1.4 3.6 1.1.5 1.2 1.7 2 3 2s2.5-.8 3-2c1.3.3 2.7-.1 3.6-1.1 1-1 1.4-2.3 1.1-3.6 1.2-.5 2-1.7 2-3Z" />
      <path fill="#fff" d="m10.6 15.6-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4Z" />
    </svg>
  );
};
