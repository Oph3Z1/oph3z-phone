import { useMemo, useRef, useState } from 'react';
import NotificationCard from './NotificationCard';

// Group notifications the way iOS does: by app + thread (route.number / tab).
// Items come in newest-first; each group keeps that order, and groups are ordered
// by their newest member.
function groupItems(items) {
  const map = new Map();
  const order = [];
  for (const n of items) {
    const key = `${n.app}:${(n.route && (n.route.number || n.route.tab)) || ''}`;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key).push(n);
  }
  return order.map((k) => map.get(k));
}

// A swipeable row: drag left past the threshold to clear; a clean tap fires onTap.
function Swipeable({ onTap, onSwipe, className, children }) {
  const [dx, setDx] = useState(0);
  const startX = useRef(null);
  const moved = useRef(false);

  const onDown = (e) => {
    startX.current = e.clientX;
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    const d = Math.min(0, e.clientX - startX.current); // only leftward
    if (d < -4) moved.current = true;
    setDx(d);
  };
  const onUp = () => {
    if (startX.current == null) return;
    if (dx < -90) onSwipe();
    else if (!moved.current && onTap) onTap();
    setDx(0);
    startX.current = null;
  };

  return (
    <div className={`notif-swipe ${className || ''}`}>
      <div className="notif-swipe__clear" style={{ opacity: Math.min(1, -dx / 80) }}>
        Clear
      </div>
      <div
        className="notif-swipe__card"
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {children}
      </div>
    </div>
  );
}

// A group: a single swipeable card, or a "stack" (swipe to clear all / tap to expand).
function NotificationGroup({ items, onOpen, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 1) {
    return (
      <Swipeable onTap={() => onOpen(items[0])} onSwipe={() => onRemove(items[0].id)}>
        <NotificationCard notif={items[0]} />
      </Swipeable>
    );
  }

  if (!expanded) {
    return (
      <Swipeable onTap={() => setExpanded(true)} onSwipe={() => items.forEach((n) => onRemove(n.id))}>
        <div className="notif-stackwrap">
          <span className="notif-stackwrap__edge notif-stackwrap__edge2" />
          <span className="notif-stackwrap__edge notif-stackwrap__edge1" />
          <NotificationCard notif={items[0]} />
        </div>
      </Swipeable>
    );
  }

  return (
    <div className="notif-group">
      {items.map((n) => (
        <Swipeable key={n.id} onTap={() => onOpen(n)} onSwipe={() => onRemove(n.id)}>
          <NotificationCard notif={n} />
        </Swipeable>
      ))}
      <button className="notif-group__less" onClick={() => setExpanded(false)}>
        Show Less
      </button>
    </div>
  );
}

export default function NotificationList({ items, onOpen, onRemove }) {
  const groups = useMemo(() => groupItems(items), [items]);
  return (
    <div className="notif-list">
      {groups.map((g) => (
        <NotificationGroup key={g[0].id} items={g} onOpen={onOpen} onRemove={onRemove} />
      ))}
    </div>
  );
}
