export const AlarmIcon = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9.5V13l2.5 1.5" />
        <path d="M5 3.5 2.5 6M19 3.5 21.5 6" />
    </svg>
);

export const StopwatchIcon = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 13.5V9" />
        <path d="M10 2.5h4M12 2.5V6" />
        <path d="M18.5 7 20 5.5" />
    </svg>
);

export const TimerIcon = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V8.5" />
        <path d="M9 2.5h6" />
    </svg>
);

export const PlayGlyph = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.5-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
    </svg>
);

export const PauseGlyph = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <rect x="6" y="5" width="4" height="14" rx="1.3" />
        <rect x="14" y="5" width="4" height="14" rx="1.3" />
    </svg>
);

export const XGlyph = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        {...props}
    >
        <path d="M6 6l12 12M18 6 6 18" />
    </svg>
);

export const PlusGlyph = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        {...props}
    >
        <path d="M12 5v14M5 12h14" />
    </svg>
);

export const MinusGlyph = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        {...props}
    >
        <path d="M6 12h12" />
    </svg>
);

export const BellGlyph = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2.5a5.5 5.5 0 0 0-5.5 5.5c0 3.6-1 5.2-1.8 6.1-.4.5-.7.8-.7 1.4 0 .8.6 1.5 1.6 1.5h12.8c1 0 1.6-.7 1.6-1.5 0-.6-.3-.9-.7-1.4-.8-.9-1.8-2.5-1.8-6.1A5.5 5.5 0 0 0 12 2.5Z" />
        <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
    </svg>
);