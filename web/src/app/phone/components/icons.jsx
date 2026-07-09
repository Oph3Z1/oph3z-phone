// Compact inline SVG icons for the Phone app (scale with font-size via 1em).

const base = { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'currentColor' };

export const StarIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 17.3l-6.16 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.48 4.73 1.64 7.03z" />
  </svg>
);

export const StarOutlineIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path d="M12 17.3l-6.16 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.48 4.73 1.64 7.03z" />
  </svg>
);

export const ClockIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PersonIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6z" />
  </svg>
);

export const KeypadIcon = (p) => (
  <svg {...base} {...p}>
    {[5, 12, 19].map((y) =>
      [5, 12, 19].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />)
    )}
  </svg>
);

export const PhoneIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .7-.2 1z" />
  </svg>
);

export const PlusIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const InfoIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
  </svg>
);

export const ChevronLeftIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const BackspaceIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 5H8L2 12l6 7h13a1 1 0 001-1V6a1 1 0 00-1-1z" />
    <path d="M15 9l-4 6M11 9l4 6" />
  </svg>
);

export const SearchIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const MicIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0014 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const MicOffIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0014 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const VideoIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="2" y="6" width="13" height="12" rx="2.5" />
    <path d="M15 10l6-3.4v10.8L15 14z" />
  </svg>
);

export const VideoOffIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="2" y="6" width="13" height="12" rx="2.5" />
    <path d="M15 10l6-3.4v10.8L15 14z" />
    <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SpeakerIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 9v6h3.5L13 20V4L7.5 9H4z" />
    <path
      d="M16 8.5a4 4 0 010 7M18.5 6a7.5 7.5 0 010 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const CamFlipIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 9a8 8 0 0113-3l2 2M20 15a8 8 0 01-13 3l-2-2" />
    <path d="M19 4v4h-4M5 20v-4h4" />
  </svg>
);
