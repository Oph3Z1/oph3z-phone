import { useRef, useState } from 'react';
import VideoPlayer from '../../photos/components/VideoPlayer';

// Fullscreen (within the phone) media viewer for chat photos/videos.
// Images support wheel/double-tap zoom + drag-to-pan; videos use the iOS player.
export default function MediaViewer({ item, onClose }) {
  const isVideo = item.type === 'video';
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);

  // Keep the pan within the image so it can't be dragged off-screen.
  const clamp = (x, y, s) => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img) return { x, y };
    const maxX = Math.max(0, (img.offsetWidth * s - stage.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * s - stage.clientHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const onWheel = (e) => {
    if (isVideo) return;
    setScale((s) => {
      const next = Math.min(5, Math.max(1, s - e.deltaY * 0.0025));
      setPos((p) => (next === 1 ? { x: 0, y: 0 } : clamp(p.x, p.y, next)));
      return next;
    });
  };
  const onPointerDown = (e) => {
    if (isVideo || scale === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setPos(clamp(drag.current.ox + (e.clientX - drag.current.x), drag.current.oy + (e.clientY - drag.current.y), scale));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };
  const onDouble = () => {
    setScale((s) => (s > 1 ? 1 : 2.5));
    setPos({ x: 0, y: 0 });
  };

  return (
    <div className="msg-viewer">
      <button className="msg-viewer__close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div
        className="msg-viewer__stage"
        ref={stageRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {isVideo ? (
          <VideoPlayer src={item.url} />
        ) : (
          <img
            ref={imgRef}
            className="msg-viewer__img"
            src={item.url}
            alt=""
            draggable={false}
            onDoubleClick={onDouble}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              cursor: dragging ? 'grabbing' : scale > 1 ? 'grab' : 'zoom-in',
            }}
          />
        )}
      </div>
    </div>
  );
}
