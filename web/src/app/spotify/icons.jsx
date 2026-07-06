// Spotify-app icons. Feather-style strokes unless a solid glyph reads better.
const S = ({ size = 24, children, fill = 'none', stroke = 'currentColor', sw = 2, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>{children}</svg>
);

export const BackArrow = (p) => <S {...p}><path d="M15 19l-7-7 7-7" /></S>;
export const ChevronDown = (p) => <S {...p}><path d="M6 9l6 6 6-6" /></S>;
export const SearchIcon = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></S>;
export const HomeIcon = (p) => <S {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></S>;
export const LibraryIcon = (p) => <S {...p}><path d="M4 5h10M4 10h10M4 15h7" /><path d="M18 8v11" /><circle cx="16" cy="19" r="2" fill="currentColor" stroke="none" /></S>;
export const PlusIcon = (p) => <S {...p} sw={2.4}><path d="M12 5v14M5 12h14" /></S>;
export const CloseIcon = (p) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>;
export const MoreIcon = (p) => <S {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></S>;

export const PlayIcon = (p) => <S {...p} fill="currentColor" stroke="none"><path d="M7 4.5v15l13-7.5z" /></S>;
export const PauseIcon = (p) => <S {...p} fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></S>;
export const NextIcon = (p) => <S {...p} fill="currentColor" stroke="none"><path d="M5 5v14l10-7z" /><rect x="17" y="5" width="3" height="14" rx="1" /></S>;
export const PrevIcon = (p) => <S {...p} fill="currentColor" stroke="none"><path d="M19 5v14L9 12z" /><rect x="4" y="5" width="3" height="14" rx="1" /></S>;

export const HeartIcon = ({ filled, ...p }) => (
  <S {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4Z" />
  </S>
);
export const ShareIcon = (p) => <S {...p}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></S>;
export const SpeakerIcon = (p) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a4 4 0 0 1 0 7" /><path d="M18.5 6a7 7 0 0 1 0 12" /></S>;
export const HeadphoneIcon = (p) => <S {...p}><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="7" rx="1.4" /><rect x="17" y="13" width="4" height="7" rx="1.4" /></S>;
export const VolumeIcon = (p) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9.5a3.5 3.5 0 0 1 0 5" /></S>;
export const TrashIcon = (p) => <S {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /></S>;
export const EditIcon = (p) => <S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>;
export const NoteIcon = (p) => <S {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></S>;

// Animated bars used by the mini player / island to show "now playing".
export const Waveform = ({ size = 18, on = true }) => (
  <span className={`sp-wave${on ? ' is-on' : ''}`} style={{ height: size }} aria-hidden>
    <i /><i /><i /><i />
  </span>
);
