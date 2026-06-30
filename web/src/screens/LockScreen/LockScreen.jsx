import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './LockScreen.css';

import flashlightIcon from '../../assets/icons/lockscreen/flashlight.png';
import lockCameraIcon from '../../assets/icons/lockscreen/camera.png';

import { unlock, setFlashlight } from '../../store/slices/phoneSlice';
import { openRoute, clearNotification } from '../../store/slices/notificationsSlice';
import NotificationList from '../../components/Notifications/NotificationList';
import { fetchNui } from '../../utils/fetchNui';
import { pad2 } from '../../utils/misc';
import { weekdayName, weatherGlyph } from '../../utils/datetime';

// Minimum upward drag (screen px) that counts as an unlock swipe.
const SWIPE_THRESHOLD = 55;

export default function LockScreen({ exiting = false, onExited }) {
  const dispatch = useDispatch();
  const time = useSelector((s) => s.phone.time);
  const flashlightOn = useSelector((s) => s.phone.flashlightOn);
  const notifs = useSelector((s) => s.notifications.items);

  const startY = useRef(null);

  const toggleFlashlight = () => {
    const next = !flashlightOn;
    dispatch(setFlashlight(next));
    fetchNui('phone:flashlight', { on: next }, { ok: true });
  };

  const onPointerDown = (e) => {
    startY.current = e.clientY;
  };

  const onPointerMove = (e) => {
    // Allow a fluid swipe: unlock as soon as the upward drag passes threshold.
    if (startY.current == null) return;
    if (startY.current - e.clientY > SWIPE_THRESHOLD) {
      startY.current = null;
      dispatch(unlock());
    }
  };

  const onPointerUp = () => {
    startY.current = null;
  };

  const clock = `${pad2(time.hours)}:${pad2(time.minutes)}`;
  const dateLine = `${weekdayName(time.weekday, true)} ${time.day}`;

  return (
    <div
      className={`lockscreen${exiting ? ' lockscreen--exit' : ''}`}
      onPointerDown={exiting ? undefined : onPointerDown}
      onPointerMove={exiting ? undefined : onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onAnimationEnd={(e) => {
        if (e.animationName === 'lock-exit' && onExited) onExited();
      }}
    >
      <div className="lockscreen__clockblock">
        <div className="lockscreen__date">
          {dateLine}
          <span className="lockscreen__weather">
            {weatherGlyph(time.weather)} {time.temperature}°
          </span>
        </div>
        <div className="lockscreen__clock">{clock}</div>
      </div>

      {/* Waiting notifications. Stop pointer propagation so scrolling/swiping the
          list doesn't trigger the swipe-to-unlock gesture on the lock screen. */}
      {notifs.length > 0 && (
        <div
          className="lockscreen__notifs"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
        >
          <div className="lockscreen__notifhead">
            <span className="lockscreen__notiftitle">Notification Center</span>
            <button className="lockscreen__notifclear" onClick={() => dispatch(clearNotification())}>
              Clear
            </button>
          </div>
          <div className="lockscreen__notifscroll">
            <NotificationList
              items={notifs}
              onOpen={(n) => dispatch(openRoute(n.route, n.id))}
              onRemove={(id) => dispatch(clearNotification(id))}
            />
          </div>
        </div>
      )}

      {/* Flashlight + camera quick actions (icons already include their bg). */}
      <div className="lockscreen__quickrow">
        <button
          className={`lockscreen__quick${flashlightOn ? ' lockscreen__quick--on' : ''}`}
          onClick={toggleFlashlight}
          aria-label="Flashlight"
        >
          <img src={flashlightIcon} alt="" />
        </button>
        <button className="lockscreen__quick" aria-label="Camera">
          <img src={lockCameraIcon} alt="" />
        </button>
      </div>

      {/* Footer: swipe hint (bouncing) + home indicator line. */}
      <div className="lockscreen__footer">
        <div className="lockscreen__hint">Swipe up to open</div>
        <div className="lockscreen__indicator" />
      </div>
    </div>
  );
}
