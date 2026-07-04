// Calculator icons.

// History (clock with a counter-clockwise arrow), matching the screenshot.
export const HistoryIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 8.5A9 9 0 1 1 3 12" />
    <path d="M3 4.5V8.5H7" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

export const ChevronLeft = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);
