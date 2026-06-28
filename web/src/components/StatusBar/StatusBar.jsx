import { useSelector } from 'react-redux';
import './StatusBar.css';

import signalIcon from '../../assets/icons/lockscreen/signalicon.svg';
import wifiIcon from '../../assets/icons/lockscreen/wifiicon.svg';
import batteryIcon from '../../assets/icons/lockscreen/batteryicon.svg';
import cameraLens from '../../assets/icons/lockscreen/camera-lens.png';
import { pad2 } from '../../utils/misc';

// Carrier label shown top-left on the lock screen.
const CARRIER = 'Fivem';

// Airplane glyph (shown instead of signal/wifi when airplane mode is on).
const AirplaneIcon = () => (
  <svg className="statusbar__icon" viewBox="0 0 24 24" fill="#fff" width="1em" height="0.95em">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
  </svg>
);

export default function StatusBar() {
  const locked = useSelector((s) => s.phone.locked);
  const time = useSelector((s) => s.phone.time);
  const airplane = useSelector((s) => s.settings.airplane);

  const clock = `${pad2(time.hours)}:${pad2(time.minutes)}`;

  return (
    <div className="statusbar">
      <div className="statusbar__left">{locked ? CARRIER : clock}</div>

      {/* Dynamic Island */}
      <div className="statusbar__island">
        <img className="statusbar__lens" src={cameraLens} alt="" />
      </div>

      <div className="statusbar__right">
        {airplane ? (
          <AirplaneIcon />
        ) : (
          <>
            <img className="statusbar__icon" src={signalIcon} alt="signal" />
            <img className="statusbar__icon" src={wifiIcon} alt="wifi" />
          </>
        )}
        <img className="statusbar__icon statusbar__battery" src={batteryIcon} alt="battery" />
      </div>
    </div>
  );
}
