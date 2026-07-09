import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Lightbox.css';
import { setLightbox } from '../../store/slices/photosSlice';

export default function Lightbox() {
    const dispatch = useDispatch();
    const url = useSelector((s) => s.photos.lightbox);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const drag = useRef(null);

    const close = () => dispatch(setLightbox(null));

    useEffect(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, [url]);

    if (!url) return null;

    const onWheel = (e) => {
        const next = Math.min(5, Math.max(1, scale - e.deltaY * 0.0015));
        setScale(next);
        if (next === 1) setOffset({ x: 0, y: 0 });
    };

    const onPointerDown = (e) => {
        if (scale <= 1) return;
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    };
    const onPointerMove = (e) => {
        if (!drag.current) return;
        setOffset({
            x: drag.current.ox + (e.clientX - drag.current.x),
            y: drag.current.oy + (e.clientY - drag.current.y),
        });
    };
    const onPointerUp = () => {
        drag.current = null;
    };

    const toggleZoom = () => {
        if (scale > 1) {
            setScale(1);
            setOffset({ x: 0, y: 0 });
        } else {
            setScale(2.5);
        }
    };

    return (
        <div
            className="lightbox"
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
            onWheel={onWheel}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
        >
            <button className="lightbox__close" onClick={close} aria-label="Close">
                ✕
            </button>
            <img
                className="lightbox__img"
                src={url}
                alt=""
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    cursor: scale > 1 ? 'grab' : 'zoom-in',
                }}
                onPointerDown={onPointerDown}
                onDoubleClick={toggleZoom}
                draggable={false}
            />
        </div>
    );
}