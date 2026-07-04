import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNow } from '../../hooks/useNow';
import { formatClock, formatLongDate } from '../../utils/datetime';
import NotificationList from './NotificationList';
import AirdropPendingCard from '../Airdrop/AirdropPendingCard';
import { setCenterOpen, openRoute, clearNotification } from '../../store/slices/notificationsSlice';
import { useT } from '../../i18n/useT';

const SWIPE_CLOSE = 55; // upward drag (px) that closes the center

// Pull-down Notification Center (phone open & unlocked). Slides down over the
// screen; swipe up (or tap a notification) to close.
export default function NotificationCenter() {
  const dispatch = useDispatch();
  const t = useT();
  const open = useSelector((s) => s.notifications.centerOpen);
  const items = useSelector((s) => s.notifications.items);
  const airdrops = useSelector((s) => s.airdrop.pending);
  const now = useNow();

  const startY = useRef(null);
  const onDown = (e) => {
    startY.current = e.clientY;
  };
  const onMove = (e) => {
    if (startY.current == null) return;
    if (startY.current - e.clientY > SWIPE_CLOSE) {
      startY.current = null;
      dispatch(setCenterOpen(false));
    }
  };
  const onUp = () => {
    startY.current = null;
  };

  const clock = formatClock(now);
  const dateLine = formatLongDate(now);

  return (
    <div
      className={`notif-center${open ? ' is-open' : ''}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <div className="notif-center__head">
        <div className="notif-center__clock">{clock}</div>
        <div className="notif-center__date">{dateLine}</div>
      </div>

      <div className="notif-center__list">
        {airdrops.length > 0 && (
          <div className="notif-center__airdrops">
            {airdrops.map((tr) => (
              <AirdropPendingCard key={tr.id} transfer={tr} />
            ))}
          </div>
        )}
        {items.length === 0 && airdrops.length === 0 ? (
          <div className="notif-center__empty">{t('notif.none')}</div>
        ) : (
          <NotificationList
            items={items}
            onOpen={(n) => dispatch(openRoute(n.route, n.id))}
            onRemove={(id) => dispatch(clearNotification(id))}
          />
        )}
      </div>

      {items.length > 0 && (
        <button className="notif-center__clear" onClick={() => dispatch(clearNotification())}>
          {t('notif.clearAll')}
        </button>
      )}

      <div className="notif-center__grab" />
    </div>
  );
}
