import { useSelector } from 'react-redux';
import { getApp } from '../../app/registry';
import './Notifications.css';

export function relTime(ts) {
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - (ts || 0));
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function notifIcon(notif) {
    if (notif.icon && /^(https?:|\.|data:|\/)/.test(notif.icon)) return notif.icon;
    const app = getApp(notif.app);
    return app ? app.icon : null;
}

export default function NotificationCard({ notif, onClick, hideTime }) {
    const externalIcon = useSelector((s) =>
        notif.icon || getApp(notif.app)
            ? null
            : (s.apps.external.find((a) => a.id === notif.app) || {}).icon || null,
    );
    const icon = notifIcon(notif) || externalIcon;
    return (
        <div
            className={`notif-card${notif.read ? ' is-read' : ''}${onClick ? ' is-tappable' : ''}`}
            onClick={onClick}
        >
            <span className="notif-card__icon">{icon ? <img src={icon} alt="" /> : null}</span>
            <div className="notif-card__body">
                <div className="notif-card__top">
                    <span className="notif-card__title">{notif.title}</span>
                    {!hideTime && <span className="notif-card__time">{relTime(notif.ts)}</span>}
                </div>
                <div className="notif-card__text">{notif.body}</div>
            </div>
        </div>
    );
}