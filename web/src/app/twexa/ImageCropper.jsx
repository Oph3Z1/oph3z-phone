import { useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { uploadToProvider, dataURLtoBlob } from '../../utils/upload';
import { useT } from '../../i18n/useT';
import { BackArrow } from './icons';

export default function ImageCropper({ src, aspect = 1, round = true, title, onCancel, onDone }) {
    const t = useT();
    const frameRef = useRef(null);
    const drag = useRef(null);
    const [frame, setFrame] = useState({ w: 0, h: 0 });
    const [nat, setNat] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [off, setOff] = useState({ x: 0, y: 0 });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const measure = () => {
            const el = frameRef.current;
            if (el) {
                const r = el.getBoundingClientRect();
                setFrame({ w: r.width, h: r.height });
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const baseScale = nat && frame.w ? Math.max(frame.w / nat.w, frame.h / nat.h) : 1;
    const dispW = nat ? nat.w * baseScale * zoom : 0;
    const dispH = nat ? nat.h * baseScale * zoom : 0;

    const clamp = (o, w, h) => ({
        x: Math.min(0, Math.max(frame.w - w, o.x)),
        y: Math.min(0, Math.max(frame.h - h, o.y)),
    });

    useEffect(() => {
        if (!nat || !frame.w) return;
        setOff(clamp({ x: (frame.w - dispW) / 2, y: (frame.h - dispH) / 2 }, dispW, dispH));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nat, frame.w, frame.h]);

    useEffect(() => {
        if (!nat) return;
        setOff((o) => clamp(o, dispW, dispH));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom]);

    const startDrag = (e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    };
    const moveDrag = (e) => {
        if (!drag.current) return;
        setOff(
            clamp(
                {
                    x: drag.current.ox + (e.clientX - drag.current.x),
                    y: drag.current.oy + (e.clientY - drag.current.y),
                },
                dispW,
                dispH,
            ),
        );
    };
    const endDrag = () => {
        drag.current = null;
    };

    const done = async () => {
        if (!nat || busy) return;
        setBusy(true);
        try {
            const scale = baseScale * zoom;
            const sx = -off.x / scale;
            const sy = -off.y / scale;
            const sw = frame.w / scale;
            const sh = frame.h / scale;
            const OUT_W = round ? 512 : 1000;
            const OUT_H = round ? 512 : Math.round(1000 / aspect);

            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = src;
            });

            const canvas = document.createElement('canvas');
            canvas.width = OUT_W;
            canvas.height = OUT_H;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            const cfg = await fetchNui('phone:media:config', {}, null);
            let url = src;
            if (cfg) {
                const uploaded = await uploadToProvider(
                    dataURLtoBlob(dataUrl),
                    round ? 'avatar.jpg' : 'banner.jpg',
                    cfg,
                );
                if (uploaded) url = uploaded;
            }
            onDone(url);
        } catch (e) {
            onDone(src);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="x-cropper">
            <div className="x-topbar">
                <button className="x-iconbtn" onClick={onCancel}>
                    <BackArrow />
                </button>
                <span className="x-topbar__title">{title || t('x.crop')}</span>
                <button className="x-topbar__save" disabled={busy} onClick={done}>
                    {busy ? t('x.saving') : t('common.done')}
                </button>
            </div>

            <div className="x-cropper__stage">
                <div
                    className={`x-cropper__frame${round ? ' is-round' : ''}`}
                    ref={frameRef}
                    style={{ aspectRatio: String(aspect) }}
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                        startDrag(e);
                    }}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                >
                    {src && (
                        <img
                            src={src}
                            alt=""
                            draggable={false}
                            onLoad={(e) =>
                                setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })
                            }
                            style={{
                                width: dispW || 'auto',
                                height: dispH || 'auto',
                                transform: `translate(${off.x}px, ${off.y}px)`,
                            }}
                        />
                    )}
                </div>

                <input
                    className="x-cropper__zoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
                <div className="x-cropper__hint">{t('x.cropHint')}</div>
            </div>
        </div>
    );
}