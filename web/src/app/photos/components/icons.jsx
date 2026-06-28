// Inline SVG icons for the Photos app (scale with font-size via 1em).
const base = { width: '1em', height: '1em', viewBox: '0 0 24 24' };

export const SearchIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

export const HeartIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
    <path d={HEART_PATH} />
  </svg>
);

export const HeartFillIcon = (p) => (
  <svg {...base} fill="currentColor" {...p}>
    <path d={HEART_PATH} />
  </svg>
);

export const TrashIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m1 0l-.7 12a1 1 0 01-1 .9H7.7a1 1 0 01-1-.9L6 7" />
  </svg>
);

export const CloseIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ChevronLeftIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const CheckIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12l5 5L20 6" />
  </svg>
);

export const PlayIcon = (p) => (
  <svg {...base} fill="currentColor" {...p}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const SlidersIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <path d="M4 7h11M4 17h7" />
    <circle cx="18" cy="7" r="2.2" />
    <circle cx="14" cy="17" r="2.2" />
  </svg>
);
