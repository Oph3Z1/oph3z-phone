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
import MusicIsland from '../../app/music/MusicIsland';

export default function Phone() {
    const locked = useSelector((s) => s.phone.locked);
    const activeApp = useSelector((s) => s.phone.activeApp);
    const wallpaperKey = useSelector((s) => s.settings.wallpaper);
    const brightness = useSelector((s) => s.settings.brightness);
    const scale = useSelector((s) => s.settings.scale);
    const inCall = useSelector((s) => !!s.call.state);

    const dim = Math.max(0, Math.min(0.72, ((100 - brightness) / 100) * 0.9));

    const screenRef = useRef(null);

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

    const showHomeBar = !locked && !!activeApp && !inCall;

    return (
        <div className="phone" style={{ '--phone-scale': (scale || 100) / 100 }}>
            <div className="phone__screen" ref={screenRef}>
                <img className="phone__wallpaper" src={getWallpaper(wallpaperKey)} alt="" />

                {!locked && <div className="phone__layer phone__layer--base">{renderBase()}</div>}

                {lockMounted && <LockScreen exiting={lockExiting} onExited={handleLockExited} />}

                <StatusBar />
                {showHomeBar && <HomeBar />}

                <ControlCenter />

                {!locked && !inCall && <NotificationBanner />}

                {!locked && <StatusToast />}

                {!inCall && <AirdropIsland />}

                <TimerIsland />
                <AlarmRing />

                {!inCall && <MusicIsland />}

                <CallOverlay />

                <AlertDialog />

                <InputDialog />

                <AirdropPicker />

                {dim > 0 && <div className="phone__dim" style={{ opacity: dim }} />}
            </div>

            <img className="phone__case" src={caseImg} alt="" />
        </div>
    );
}