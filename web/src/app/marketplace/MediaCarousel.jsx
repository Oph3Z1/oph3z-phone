import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, PlayIcon } from './icons';

export default function MediaCarousel({ media = [], onOpen }) {
    const [i, setI] = useState(0);
    const [drag, setDrag] = useState(0);
    const start = useRef(null);
    const width = useRef(1);
    const moved = useRef(false);
    const n = media.length;

    if (n === 0) return null;

    const clamp = (v) => Math.max(0, Math.min(n - 1, v));
    const go = (to) => setI(clamp(to));

    const onDown = (e) => {
        start.current = e.clientX;
        width.current = e.currentTarget.clientWidth || 1;
        moved.current = false;
    };
    const onMove = (e) => {
        if (start.current == null) return;
        const dx = e.clientX - start.current;
        if (Math.abs(dx) > 5) moved.current = true;
        setDrag(dx);
    };
    const onUp = () => {
        if (start.current == null) return;
        const threshold = width.current * 0.18;
        if (drag <= -threshold) go(i + 1);
        else if (drag >= threshold) go(i - 1);
        start.current = null;
        setDrag(0);
    };
    const open = (m) => {
        if (!moved.current) onOpen && onOpen(m);
    };

    const pct = -(i * 100);
    const dragPct = (drag / width.current) * 100;

    return (
        <div className="mkt-carousel">
            <div
                className="mkt-carousel__track"
                style={{
                    transform: `translateX(calc(${pct}% + ${dragPct}%))`,
                    transition:
                        start.current == null
                            ? 'transform .32s cubic-bezier(.22,.61,.36,1)'
                            : 'none',
                }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
            >
                {media.map((m, idx) => (
                    <button className="mkt-carousel__slide" key={idx} onClick={() => open(m)}>
                        {m.type === 'video' ? (
                            <>
                                {m.thumb ? (
                                    <img src={m.thumb} alt="" draggable={false} />
                                ) : (
                                    <div className="mkt-carousel__vbg" />
                                )}
                                <span className="mkt-carousel__play">
                                    <PlayIcon size={26} />
                                </span>
                            </>
                        ) : (
                            <img src={m.url} alt="" draggable={false} />
                        )}
                    </button>
                ))}
            </div>

            {n > 1 && (
                <>
                    <button
                        className="mkt-carousel__arrow mkt-carousel__arrow--l"
                        disabled={i === 0}
                        onClick={() => go(i - 1)}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        className="mkt-carousel__arrow mkt-carousel__arrow--r"
                        disabled={i === n - 1}
                        onClick={() => go(i + 1)}
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div className="mkt-carousel__dots">
                        {media.map((_, idx) => (
                            <span
                                key={idx}
                                className={`mkt-carousel__dot${idx === i ? ' is-on' : ''}`}
                                onClick={() => go(idx)}
                            />
                        ))}
                    </div>
                    <div className="mkt-carousel__count">
                        {i + 1}/{n}
                    </div>
                </>
            )}
        </div>
    );
}