const base = { width: '1em', height: '1em', viewBox: '0 0 24 24' };

export const ChevronLeftIcon = (p) => (
    <svg
        {...base}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...p}
    >
        <path d="M15 5l-7 7 7 7" />
    </svg>
);

export const FlipIcon = (p) => (
    <svg
        {...base}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...p}
    >
        <path d="M3 9a9 9 0 0114-3l1 1M21 15a9 9 0 01-14 3l-1-1" />
        <path d="M18 4v3h-3M6 20v-3h3" />
        <circle cx="12" cy="12" r="2.5" />
    </svg>
);