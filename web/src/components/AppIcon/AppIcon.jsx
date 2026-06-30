import { useDispatch, useSelector } from 'react-redux';
import './AppIcon.css';
import { openApp } from '../../store/slices/phoneSlice';
import { getApp } from '../../app/registry';

/**
 * A tappable home/dock app icon, with an unread-notification badge.
 * @param {{ appId: string, showLabel?: boolean }} props
 */
export default function AppIcon({ appId, showLabel = true }) {
  const dispatch = useDispatch();
  const count = useSelector((s) =>
    s.notifications.items.reduce((acc, n) => acc + (!n.read && n.app === appId ? 1 : 0), 0)
  );
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
        {count > 0 && <span className="appicon__badge">{count > 99 ? '99+' : count}</span>}
      </span>
      {showLabel && <span className="appicon__label">{app.name}</span>}
    </button>
  );
}
