// Marketplace icons — thin Feather-style strokes that inherit currentColor.
const S = ({ size = 22, children, fill = 'none', stroke = 'currentColor', sw = 1.9, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    {children}
  </svg>
);

export const BackArrow = (p) => <S {...p}><path d="M15 19l-7-7 7-7" /></S>;
export const SearchIcon = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></S>;
export const PlusIcon = (p) => <S {...p} sw={2.4}><path d="M12 5v14M5 12h14" /></S>;
export const CloseIcon = (p) => <S {...p}><path d="M18 6L6 18M6 6l12 12" /></S>;
export const PhoneIcon = (p) => (
  <S {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></S>
);
export const MessageIcon = (p) => <S {...p}><path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L4 20.5l1.2-4.9A8.5 8.5 0 1 1 21 11.5Z" /></S>;
export const EditIcon = (p) => <S {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>;
export const TrashIcon = (p) => <S {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /><path d="M10 11v6M14 11v6" /></S>;
export const CameraIcon = (p) => <S {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></S>;
export const GalleryIcon = (p) => <S {...p}><rect x="3" y="3" width="18" height="18" rx="2.4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" /></S>;
export const LinkIcon = (p) => <S {...p}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></S>;
export const ChevronLeft = (p) => <S {...p} sw={2.2}><path d="M15 18l-6-6 6-6" /></S>;
export const ChevronRight = (p) => <S {...p} sw={2.2}><path d="M9 18l6-6-6-6" /></S>;
export const PlayIcon = (p) => <S {...p} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z" /></S>;
export const CheckIcon = (p) => <S {...p} sw={2.4}><path d="M20 6L9 17l-5-5" /></S>;
export const TagIcon = (p) => <S {...p}><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.6-1.4V4a2 2 0 0 1 2-2h8.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" /></S>;
