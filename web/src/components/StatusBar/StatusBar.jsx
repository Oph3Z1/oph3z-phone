import { useDispatch, useSelector } from 'react-redux';
import './StatusBar.css';
import { setEditing, saveHome } from '../../store/slices/homeSlice';
import { toggleControlCenter } from '../../store/slices/phoneSlice';

import signalIcon from '../../assets/icons/lockscreen/signalicon.svg';
import wifiIcon from '../../assets/icons/lockscreen/wifiicon.svg';
import batteryIcon from '../../assets/icons/lockscreen/batteryicon.svg';
import cameraLens from '../../assets/icons/lockscreen/camera-lens.png';
import { useNow } from '../../hooks/useNow';
import { formatClock } from '../../utils/datetime';

// Airplane glyph (shown instead of signal/wifi when airplane mode is on).
const AirplaneIcon = () => (
  <svg className="statusbar__icon statusbar__airplane" viewBox="0 0 24 24" fill="#fff" width="1.25em" height="1.2em">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
  </svg>
);

export default function StatusBar() {
  const dispatch = useDispatch();
  const airplane = useSelector((s) => s.settings.airplane);
  // Home-screen edit mode replaces the right-side icons with a "Done" button (iOS).
  const editing = useSelector((s) => s.home.editing && !s.phone.activeApp && !s.phone.locked);
  // The music Dynamic Island sits over the notch — hide the wifi icon to give it room.
  const islandOn = useSelector((s) =>
    !!s.music.title && s.music.playing && s.phone.activeApp !== 'spotify' && !s.phone.locked && !s.call.state
  );

  const clock = formatClock(useNow());

  return (
    <div className="statusbar">
      <div className="statusbar__left">{clock}</div>

      {/* Dynamic Island */}
      <div className="statusbar__island">
        <img className="statusbar__lens" src={cameraLens} alt="" />
      </div>

      <div className="statusbar__right">
        {editing ? (
          <button
            className="statusbar__done"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { dispatch(setEditing(false)); dispatch(saveHome()); }}
          >
            Done
          </button>
        ) : (
          // Tapping the signal / wifi / battery group opens the Control Center.
          <button
            className="statusbar__cc"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => dispatch(toggleControlCenter())}
            aria-label="Control Center"
          >
            {airplane ? (
              <AirplaneIcon />
            ) : (
              <>
                <img className="statusbar__icon" src={signalIcon} alt="signal" />
                {!islandOn && <img className="statusbar__icon" src={wifiIcon} alt="wifi" />}
              </>
            )}
            <img className="statusbar__icon statusbar__battery" src={batteryIcon} alt="battery" />
          </button>
        )}
      </div>
    </div>
  );
}
