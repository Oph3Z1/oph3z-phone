import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NotificationCard from './NotificationCard';
import { clearToast } from '../../store/slices/toastSlice';

const TOAST_MS = 3200;

export default function StatusToast() {
    const dispatch = useDispatch();
    const toast = useSelector((s) => s.toast.toast);

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => dispatch(clearToast()), TOAST_MS);
        return () => clearTimeout(t);
    }, [toast, dispatch]);

    if (!toast) return null;

    return (
        <div className={`status-toast status-toast--${toast.type}`} key={toast.id}>
            <NotificationCard notif={toast} hideTime />
        </div>
    );
}