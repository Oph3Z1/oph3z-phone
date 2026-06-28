import { useDispatch } from 'react-redux';
import './AppIcon.css';
import { openApp } from '../../store/slices/phoneSlice';
import { getApp } from '../../app/registry';

/**
 * A tappable home/dock app icon.
 * @param {{ appId: string, showLabel?: boolean }} props
 */
export default function AppIcon({ appId, showLabel = true }) {
  const dispatch = useDispatch();
  const app = getApp(appId);
  if (!app) return null;

  return (
    <button
      className="appicon"
      onClick={() => dispatch(openApp(app.id))}
      aria-label={app.name}
    >
      <span className="appicon__img">
        <img src={app.icon} alt="" />
      </span>
      {showLabel && <span className="appicon__label">{app.name}</span>}
    </button>
  );
}
