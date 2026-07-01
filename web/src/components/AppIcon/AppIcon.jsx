import { useDispatch, useSelector } from 'react-redux';
import './AppIcon.css';
import { openApp } from '../../store/slices/phoneSlice';

/**
 * A tappable home/dock app icon, with an unread-notification badge.
 * Works for both built-in and third-party apps.
 * @param {{ app: { id:string, label:string, icon?:string }, showLabel?: boolean }} props
 */
export default function AppIcon({ app, showLabel = true }) {
  const dispatch = useDispatch();
  const count = useSelector((s) =>
    s.notifications.items.reduce((acc, n) => acc + (!n.read && n.app === app.id ? 1 : 0), 0)
  );
  if (!app) return null;

  return (
    <button className="appicon" onClick={() => dispatch(openApp(app.id))} aria-label={app.label}>
      <span className="appicon__img">
        {app.icon ? (
          <img src={app.icon} alt="" />
        ) : (
          <span className="appicon__fallback">{(app.label || '?').charAt(0).toUpperCase()}</span>
        )}
        {count > 0 && <span className="appicon__badge">{count > 99 ? '99+' : count}</span>}
      </span>
      {showLabel && <span className="appicon__label">{app.label}</span>}
    </button>
  );
}
