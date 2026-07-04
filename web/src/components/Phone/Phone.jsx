import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import './Phone.css';

import caseImg from '../../assets/frame/case.png';
import { getWallpaper, DESIGN_WIDTH } from '../../config/phone.config';

import StatusBar from '../StatusBar/StatusBar';
import HomeBar from '../HomeBar/HomeBar';
import LockScreen from '../../screens/LockScreen/LockScreen';
import HomeScreen from '../../screens/HomeScreen/HomeScreen';
import AppScreen from '../../screens/AppScreen/AppScreen';
import CallOverlay from '../../app/phone/call/CallOverlay';
import NotificationBanner from '../Notifications/NotificationBanner';
import StatusToast from '../Notifications/StatusToast';
import AirdropIsland from '../Airdrop/AirdropIsland';
import AirdropPicker from '../Airdrop/AirdropPicker';
import TimerIsland from '../Clock/TimerIsland';
import AlarmRing from '../Clock/AlarmRing';
import AlertDialog from '../AlertDialog/AlertDialog';
import InputDialog from '../InputDialog/InputDialog';
import ControlCenter from '../ControlCenter/ControlCenter';

export default function Phone() {
  const locked = useSelector((s) => s.phone.locked);
  const activeApp = useSelector((s) => s.phone.activeApp);
  const wallpaperKey = useSelector((s) => s.settings.wallpaper);
  const brightness = useSelector((s) => s.settings.brightness);
  const scale = useSelector((s) => s.settings.scale);
  const inCall = useSelector((s) => !!s.call.state);

  // Brightness dims the screen with a black veil (min 20% -> never fully dark).
  const dim = Math.max(0, Math.min(0.72, ((100 - brightness) / 100) * 0.9));

  const screenRef = useRef(null);

  // Lock-screen lifecycle: keep it mounted through its slide-up exit animation
  // so the home screen is revealed beneath it (like iOS).
  const [lockMounted, setLockMounted] = useState(locked);
  const [lockExiting, setLockExiting] = useState(false);

  useEffect(() => {
    if (locked) {
      setLockMounted(true);
      setLockExiting(false);
    } else if (lockMounted) {
      setLockExiting(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const handleLockExited = () => {
    setLockMounted(false);
    setLockExiting(false);
  };

  // Responsive: scale all in-UI sizing from the screen's real width.
  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const applyScale = () => {
      const scale = el.clientWidth / DESIGN_WIDTH;
      el.style.fontSize = `${scale * 16}px`;
    };
    applyScale();
    const ro = new ResizeObserver(applyScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderBase = () => {
    if (activeApp) return <AppScreen appId={activeApp} />;
    return <HomeScreen />;
  };

  // Home indicator shows only inside an app (not on the home screen / calls).
  const showHomeBar = !locked && !!activeApp && !inCall;

  return (
    <div className="phone" style={{ '--phone-scale': (scale || 100) / 100 }}>
      {/* Screen layer sits ON TOP of the (opaque) case. */}
      <div className="phone__screen" ref={screenRef}>
        <img className="phone__wallpaper" src={getWallpaper(wallpaperKey)} alt="" />

        {/* Base layer: home screen / open app (revealed under the lock). */}
        {!locked && <div className="phone__layer phone__layer--base">{renderBase()}</div>}

        {/* Lock screen overlay (animates out on unlock). */}
        {lockMounted && (
          <LockScreen exiting={lockExiting} onExited={handleLockExited} />
        )}

        {/* Floating overlays (status bar sits on the camera's black top bar). */}
        <StatusBar />
        {showHomeBar && <HomeBar />}

        {/* Control Center (pull-down from the status bar icons). */}
        <ControlCenter />

        {/* Transient notification banner (phone open & unlocked). */}
        {!locked && !inCall && <NotificationBanner />}

        {/* Transient status toast (success / error / info) — throwaway, not saved. */}
        {!locked && <StatusToast />}

        {/* AirDrop receive prompt (Dynamic Island) — shows over the home OR lock
            screen while the phone is open, just like an incoming call. */}
        {!inCall && <AirdropIsland />}

        {/* Timer Dynamic Island (home / other apps, not lock) + the ringing
            overlay for a firing alarm / finished timer. Both sit BELOW the call
            and AirDrop islands. */}
        <TimerIsland />
        <AlarmRing />

        {/* Call UI (incoming island / calling / in-call) on top of everything. */}
        <CallOverlay />

        {/* Reusable confirm / alert dialog (delete confirmation, third-party apps). */}
        <AlertDialog />

        {/* Reusable text-input popup (rename ID, third-party apps). */}
        <InputDialog />

        {/* AirDrop share picker (nearby people) — opened via openShare(...). */}
        <AirdropPicker />

        {/* Brightness veil — over EVERYTHING (status bar, island, apps, Control
            Center). pointer-events:none so it never blocks interaction. */}
        {dim > 0 && <div className="phone__dim" style={{ opacity: dim }} />}
      </div>

      {/* The physical case / frame. */}
      <img className="phone__case" src={caseImg} alt="" />
    </div>
  );
}
