import { useEffect, useRef } from 'react';
import { pad2 } from './format';

// A single iOS-style picker column (0..max). Supports the mouse wheel AND
// click-and-drag (grab the column and pull it up/down, like a real iPhone).
// `label` sits beside the centered value ("Hours" / "Min" / "Sec").
export default function Wheel({ max, value, onChange, label, twoDigit = true }) {
  const ref = useRef(null);
  const settling = useRef(null);
  const itemH = useRef(0);
  const drag = useRef(null); // { startY, startScroll, moved } while mouse-dragging
  const suppressClick = useRef(false); // eat the click that ends a drag

  const measure = () => {
    const el = ref.current;
    const item = el && el.querySelector('.clk-wheel__item');
    itemH.current = item ? item.offsetHeight : 0;
    return itemH.current;
  };

  // Keep the scroll position in sync with the external value (never mid-drag).
  useEffect(() => {
    const el = ref.current;
    if (!el || drag.current) return;
    const h = measure();
    if (!h) return;
    const target = value * h;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Snap to the nearest item and report it (smoothly eases into place).
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

  // Native scrolling (mouse wheel / trackpad): snap once it settles.
  const onScroll = () => {
    if (drag.current) return; // drag handles its own snapping
    clearTimeout(settling.current);
    settling.current = setTimeout(snap, 80);
  };

  // ---- Mouse click-and-drag -------------------------------------------------
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return; // touch/pen use native scrolling
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
    ref.current.scrollTop = d.startScroll - dy; // 1:1 grab-and-pull
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d) return;
    try {
      ref.current.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    drag.current = null;
    if (d.moved > 4) suppressClick.current = true; // it was a drag, not a tap
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
