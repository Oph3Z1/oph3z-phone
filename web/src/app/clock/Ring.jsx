export default function Ring({ progress, children, className = '' }) {
    const R = 46;
    const C = 2 * Math.PI * R;
    const clamped = Math.max(0, Math.min(1, progress));
    return (
        <div className={`clk-ring ${className}`}>
            <svg viewBox="0 0 100 100" className="clk-ring__svg">
                <circle className="clk-ring__track" cx="50" cy="50" r={R} />
                <circle
                    className="clk-ring__bar"
                    cx="50"
                    cy="50"
                    r={R}
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - clamped)}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                />
            </svg>
            <div className="clk-ring__inner">{children}</div>
        </div>
    );
}