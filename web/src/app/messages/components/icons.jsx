const base = { width: '1em', height: '1em', viewBox: '0 0 24 24' };

export const ChevronLeftIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const ChevronRightIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const ComposeIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M16 3l5 5L8 21H3v-5L16 3z" />
  </svg>
);
export const CameraIcon = (p) => (
  <svg {...base} fill="currentColor" {...p}>
    <path d="M9 4l-1.2 2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-3.8L15 4H9zm3 5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" />
  </svg>
);
export const PlusIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MicIcon = (p) => (
  <svg {...base} fill="currentColor" {...p}>
    <path d="M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3z" />
    <path d="M19 11a7 7 0 01-14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
export const CheckIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12l5 5L20 6" />
  </svg>
);
export const SendIcon = (p) => (
  <svg {...base} fill="currentColor" {...p}>
    <path d="M12 4l7 7h-4v9h-6v-9H5l7-7z" />
  </svg>
);
export const GifIcon = (p) => (
  <svg {...base} viewBox="0 0 28 24" fill="none" {...p}>
    <rect x="1.5" y="3.5" width="25" height="17" rx="4" stroke="currentColor" strokeWidth="2" />
    <text x="14" y="16.4" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="currentColor" fontFamily="sans-serif">
      GIF
    </text>
  </svg>
);
export const GroupAddIcon = (p) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0111 0" />
    <path d="M17 7v6M14 10h6" />
  </svg>
);
