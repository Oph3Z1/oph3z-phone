import { useEffect, useState } from 'react';

export function useTicker(active, interval = 250) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) return undefined;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), interval);
        return () => clearInterval(id);
    }, [active, interval]);
    return now;
}