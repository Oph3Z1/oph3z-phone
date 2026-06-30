import { getApp } from '../../app/registry';
import './Notifications.css';

// Relative time like iOS: now / 5m ago / 2h ago / 3d ago.
export function relTime(ts) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - (ts || 0));
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Icon: an explicit override (url/path/data), else the app's home-screen icon.
export function notifIcon(notif) {
  if (notif.icon && /^(https?:|\.|data:|\/)/.test(notif.icon)) return notif.icon;
  const app = getApp(notif.app);
  return app ? app.icon : null;
}

// A single liquid-glass notification card.
export default function NotificationCard({ notif, onClick }) {
  const icon = notifIcon(notif);
  return (
    <div
      className={`notif-card${notif.read ? ' is-read' : ''}${onClick ? ' is-tappable' : ''}`}
      onClick={onClick}
    >
      <span className="notif-card__icon">{icon ? <img src={icon} alt="" /> : null}</span>
      <div className="notif-card__body">
        <div className="notif-card__top">
          <span className="notif-card__title">{notif.title}</span>
          <span className="notif-card__time">{relTime(notif.ts)}</span>
        </div>
        <div className="notif-card__text">{notif.body}</div>
      </div>
    </div>
  );
}
