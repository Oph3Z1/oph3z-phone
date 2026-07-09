import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './LockScreen.css';

import flashlightIcon from '../../assets/icons/lockscreen/flashlight.png';
import lockCameraIcon from '../../assets/icons/lockscreen/camera.png';

import { unlock, setFlashlight, openApp } from '../../store/slices/phoneSlice';
import { openRoute, clearNotification } from '../../store/slices/notificationsSlice';
import NotificationList from '../../components/Notifications/NotificationList';
import AirdropPendingCard from '../../components/Airdrop/AirdropPendingCard';
import LockTimerWidget from '../../components/Clock/LockTimerWidget';
import LockMusicWidget from '../../app/music/LockMusicWidget';
import { fetchNui } from '../../utils/fetchNui';
import { useNow } from '../../hooks/useNow';
import { formatClock, formatLongDate } from '../../utils/datetime';
import { useT } from '../../i18n/useT';

const SWIPE_THRESHOLD = 55;

export default function LockScreen({ exiting = false, onExited }) {
    const dispatch = useDispatch();
    const t = useT();
    const now = useNow();
    const flashlightOn = useSelector((s) => s.phone.flashlightOn);
    const notifs = useSelector((s) => s.notifications.items);
    const airdrops = useSelector((s) => s.airdrop.pending);
    const hasTimer = useSelector((s) => !!s.clock.timer);

    const startY = useRef(null);

    const toggleFlashlight = () => {
        const next = !flashlightOn;
        dispatch(setFlashlight(next));
        fetchNui('phone:flashlight', { on: next }, { ok: true });
    };

    const openCamera = () => {
        dispatch(unlock());
        dispatch(openApp('camera'));
    };

    const onPointerDown = (e) => {
        startY.current = e.clientY;
    };

    const onPointerMove = (e) => {
        if (startY.current == null) return;
        if (startY.current - e.clientY > SWIPE_THRESHOLD) {
            startY.current = null;
            dispatch(unlock());
        }
    };

    const onPointerUp = () => {
        startY.current = null;
    };

    const clock = formatClock(now);
    const dateLine = formatLongDate(now);

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
                <div className="lockscreen__date">{dateLine}</div>
                <div className="lockscreen__clock">{clock}</div>
            </div>

            {(notifs.length > 0 || airdrops.length > 0 || hasTimer) && (
                <div
                    className="lockscreen__notifs"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerMove={(e) => e.stopPropagation()}
                >
                    <div className="lockscreen__notifhead">
                        <span className="lockscreen__notiftitle">{t('notif.center')}</span>
                        {notifs.length > 0 && (
                            <button
                                className="lockscreen__notifclear"
                                onClick={() => dispatch(clearNotification())}
                            >
                                {t('notif.clear')}
                            </button>
                        )}
                    </div>
                    <div className="lockscreen__notifscroll">
                        {hasTimer && <LockTimerWidget />}
                        {airdrops.length > 0 && (
                            <div className="notif-center__airdrops">
                                {airdrops.map((tr) => (
                                    <AirdropPendingCard key={tr.id} transfer={tr} />
                                ))}
                            </div>
                        )}
                        <NotificationList
                            items={notifs}
                            onOpen={(n) => dispatch(openRoute(n.route, n.id))}
                            onRemove={(id) => dispatch(clearNotification(id))}
                        />
                    </div>
                </div>
            )}

            <LockMusicWidget />

            <div className="lockscreen__quickrow">
                <button
                    className={`lockscreen__quick${flashlightOn ? ' lockscreen__quick--on' : ''}`}
                    onClick={toggleFlashlight}
                    aria-label="Flashlight"
                >
                    <img src={flashlightIcon} alt="" />
                </button>
                <button className="lockscreen__quick" onClick={openCamera} aria-label="Camera">
                    <img src={lockCameraIcon} alt="" />
                </button>
            </div>

            <div className="lockscreen__footer">
                <div className="lockscreen__hint">{t('notif.swipeUp')}</div>
                <div className="lockscreen__indicator" />
            </div>
        </div>
    );
}