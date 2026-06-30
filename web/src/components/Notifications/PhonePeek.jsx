import { useLayoutEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import caseImg from '../../assets/frame/case.png';
import { getWallpaper, DESIGN_WIDTH } from '../../config/phone.config';
import StatusBar from '../StatusBar/StatusBar';
import NotificationCard from './NotificationCard';

// When the phone is CLOSED and a notification arrives, the phone peeks up from
// its resting spot showing just the top (notch + status bar + the notification),
// holds a few seconds, then slides back down. Purely visual (no NUI focus); the
// player opens the phone with their key to act on it.
export default function PhonePeek({ notif, onDone }) {
  const wallpaperKey = useSelector((s) => s.settings.wallpaper);
  const screenRef = useRef(null);

  // Match the phone's runtime font-size scaling so `em` sizing is proportional.
  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return undefined;
    const apply = () => {
      el.style.fontSize = `${(el.clientWidth / DESIGN_WIDTH) * 16}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="phone phone-peek"
      onAnimationEnd={(e) => {
        if (e.animationName === 'phone-peek-slide' && onDone) onDone();
      }}
    >
      <div className="phone__screen phone-peek__screen" ref={screenRef}>
        <img className="phone__wallpaper" src={getWallpaper(wallpaperKey)} alt="" />
        <StatusBar />
        <div className="phone-peek__notif">
          <NotificationCard notif={notif} />
        </div>
      </div>
      <img className="phone__case" src={caseImg} alt="" />
    </div>
  );
}
