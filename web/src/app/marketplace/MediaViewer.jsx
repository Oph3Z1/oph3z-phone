import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from './icons';

export default function MediaViewer({ item, onClose }) {
    const isVideo = item.type === 'video';
    const [scale, setScale] = useState(1);
    const [off, setOff] = useState({ x: 0, y: 0 });
    const pan = useRef(null);
    const moved = useRef(false);

    useEffect(() => {
        setScale(1);
        setOff({ x: 0, y: 0 });
    }, [item.url]);

    const clamp = (s) => Math.min(5, Math.max(1, s));
    const applyScale = (n) => {
        const v = clamp(n);
        setScale(v);
        if (v === 1) setOff({ x: 0, y: 0 });
    };
    const zoomBy = (d) => applyScale(scale + d);
    const toggle = () => (scale > 1 ? applyScale(1) : setScale(2.5));
    const onWheel = (e) => applyScale(scale - e.deltaY * 0.0015);

    const onDown = (e) => {
        moved.current = false;
        if (scale <= 1) return;
        if (e.target.closest && e.target.closest('.mkt-viewer__close, .mkt-viewer__zoom')) return;
        pan.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
    };
    const onMove = (e) => {
        if (!pan.current) return;
        moved.current = true;
        setOff({
            x: pan.current.ox + (e.clientX - pan.current.x),
            y: pan.current.oy + (e.clientY - pan.current.y),
        });
    };
    const onUp = (e) => {
        if (pan.current) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
        pan.current = null;
    };

    const onStageClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const style = {
        transform: `translate(${off.x}px, ${off.y}px) scale(${scale})`,
        cursor: scale > 1 ? 'grab' : 'zoom-in',
    };

    return (
        <div
            className="mkt-viewer"
            onWheel={onWheel}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
        >
            <button className="mkt-viewer__close" onClick={onClose} aria-label="Close">
                <CloseIcon size={20} />
            </button>

            <div className="mkt-viewer__stage" onClick={onStageClick}>
                {isVideo ? (
                    <video
                        className="mkt-viewer__media"
                        src={item.url}
                        style={style}
                        controls
                        autoPlay
                        playsInline
                        onDoubleClick={toggle}
                    />
                ) : (
                    <img
                        className="mkt-viewer__media"
                        src={item.url}
                        alt=""
                        style={style}
                        draggable={false}
                    />
                )}
            </div>

            <div className="mkt-viewer__zoom">
                <button onClick={() => zoomBy(-0.5)} disabled={scale <= 1} aria-label="Zoom out">
                    −
                </button>
                <button onClick={() => zoomBy(0.5)} disabled={scale >= 5} aria-label="Zoom in">
                    +
                </button>
            </div>
        </div>
    );
}