import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NotificationCard from './NotificationCard';
import { clearToast } from '../../store/slices/toastSlice';

const TOAST_MS = 3200;
const SWIPE_UP = 24;
const TAP_MOVE = 10;

export default function StatusToast() {
    const dispatch = useDispatch();
    const toast = useSelector((s) => s.toast.toast);
    const startY = useRef(null);

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => dispatch(clearToast()), TOAST_MS);
        return () => clearTimeout(t);
    }, [toast, dispatch]);

    if (!toast) return null;

    const onPointerDown = (e) => {
        startY.current = e.clientY;
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };
    const onPointerUp = (e) => {
        const start = startY.current;
        startY.current = null;
        if (start == null) {
            dispatch(clearToast());
            return;
        }
        const dy = start - e.clientY;
        if (dy > SWIPE_UP || Math.abs(dy) < TAP_MOVE) dispatch(clearToast());
    };

    return (
        <div
            className={`status-toast status-toast--${toast.type}`}
            key={toast.id}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
        >
            <NotificationCard notif={toast} hideTime />
        </div>
    );
}
