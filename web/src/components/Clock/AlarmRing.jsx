import { useDispatch, useSelector } from 'react-redux';
import './Clock.css';
import { stopRing } from '../../store/slices/clockSlice';
import { getWallpaper } from '../../config/phone.config';
import { useNow } from '../../hooks/useNow';
import { formatClock, formatLongDate } from '../../utils/datetime';
import { useT } from '../../i18n/useT';

export default function AlarmRing() {
    const dispatch = useDispatch();
    const t = useT();
    const now = useNow();
    const ringing = useSelector((s) => s.clock.ringing);
    const wallpaperKey = useSelector((s) => s.settings.wallpaper);
    const inCall = useSelector((s) => !!s.call.state);
    const airdrop = useSelector((s) => s.airdrop.island);

    if (!ringing || inCall || airdrop) return null;

    const isAlarm = ringing.kind === 'alarm';
    const title = isAlarm ? ringing.label || t('clock.alarm') : t('clock.timer');

    return (
        <div className="clk-alarmscreen">
            <img className="clk-alarmscreen__wall" src={getWallpaper(wallpaperKey)} alt="" />
            <div className="clk-alarmscreen__scrim" />

            <div className="clk-alarmscreen__top">
                <div className="clk-alarmscreen__date">{formatLongDate(now)}</div>
                <div className="clk-alarmscreen__clock">{formatClock(now)}</div>
            </div>

            <div className="clk-alarmscreen__center">
                <div className="clk-alarmscreen__title">{title}</div>
            </div>

            <button className="clk-alarmscreen__stop" onClick={() => dispatch(stopRing())}>
                {t('clock.stop')}
            </button>
        </div>
    );
}