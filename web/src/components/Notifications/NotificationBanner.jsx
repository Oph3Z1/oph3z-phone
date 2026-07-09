import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NotificationCard from './NotificationCard';
import { setBanner, openRoute } from '../../store/slices/notificationsSlice';

export default function NotificationBanner() {
    const dispatch = useDispatch();
    const notif = useSelector((s) => s.notifications.banner);

    useEffect(() => {
        if (!notif) return undefined;
        const t = setTimeout(() => dispatch(setBanner(null)), 4200);
        return () => clearTimeout(t);
    }, [notif, dispatch]);

    if (!notif) return null;

    return (
        <div className="notif-banner" key={notif.id}>
            <NotificationCard
                notif={notif}
                onClick={() => dispatch(openRoute(notif.route, notif.id))}
            />
        </div>
    );
}