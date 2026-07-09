import { useLayoutEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import caseImg from '../../assets/frame/case.png';
import { getWallpaper, DESIGN_WIDTH } from '../../config/phone.config';
import StatusBar from '../StatusBar/StatusBar';
import NotificationCard from './NotificationCard';

export default function PhonePeek({ notif, onDone }) {
    const wallpaperKey = useSelector((s) => s.settings.wallpaper);
    const screenRef = useRef(null);

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