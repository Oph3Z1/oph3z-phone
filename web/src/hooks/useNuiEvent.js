import { useEffect, useRef } from 'react';

export function useNuiEvent(action, handler) {
    const savedHandler = useRef(handler);

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const listener = (event) => {
            const { action: a, data } = event.data ?? {};
            if (a === action && savedHandler.current) {
                savedHandler.current(data);
            }
        };

        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, [action]);
}