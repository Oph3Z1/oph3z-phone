import { useEffect, useRef } from 'react';
import { pad2 } from './format';

export default function Wheel({ max, value, onChange, label, twoDigit = true }) {
    const ref = useRef(null);
    const settling = useRef(null);
    const itemH = useRef(0);
    const drag = useRef(null);
    const suppressClick = useRef(false);

    const measure = () => {
        const el = ref.current;
        const item = el && el.querySelector('.clk-wheel__item');
        itemH.current = item ? item.offsetHeight : 0;
        return itemH.current;
    };

    useEffect(() => {
        const el = ref.current;
        if (!el || drag.current) return;
        const h = measure();
        if (!h) return;
        const target = value * h;
        if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const snap = () => {
        const el = ref.current;
        const h = itemH.current || measure();
        if (!el || !h) return;
        let idx = Math.round(el.scrollTop / h);
        idx = Math.max(0, Math.min(max, idx));
        if (idx !== value) onChange(idx);
        const target = idx * h;
        if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target, behavior: 'smooth' });
    };

    const onScroll = () => {
        if (drag.current) return;
        clearTimeout(settling.current);
        settling.current = setTimeout(snap, 80);
    };

    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse') return;
        const el = ref.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);
        clearTimeout(settling.current);
        drag.current = { startY: e.clientY, startScroll: el.scrollTop, moved: 0 };
    };
    const onPointerMove = (e) => {
        const d = drag.current;
        if (!d) return;
        const dy = e.clientY - d.startY;
        if (Math.abs(dy) > d.moved) d.moved = Math.abs(dy);
        ref.current.scrollTop = d.startScroll - dy;
    };
    const onPointerUp = (e) => {
        const d = drag.current;
        if (!d) return;
        try {
            ref.current.releasePointerCapture(e.pointerId);
        } catch {}
        drag.current = null;
        if (d.moved > 4) suppressClick.current = true;
        snap();
    };

    const pick = (n) => {
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        onChange(n);
    };

    const nums = [];
    for (let i = 0; i <= max; i++) nums.push(i);

    return (
        <div className="clk-wheel-wrap">
            <div
                className="clk-wheel"
                ref={ref}
                onScroll={onScroll}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div className="clk-wheel__pad" />
                {nums.map((n) => (
                    <button
                        key={n}
                        type="button"
                        className={`clk-wheel__item${n === value ? ' is-sel' : ''}`}
                        onClick={() => pick(n)}
                    >
                        <span className="clk-wheel__num">{twoDigit ? pad2(n) : n}</span>
                    </button>
                ))}
                <div className="clk-wheel__pad" />
            </div>
            {label && <span className="clk-wheel__label">{label}</span>}
        </div>
    );
}