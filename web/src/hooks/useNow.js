import { useEffect, useState } from 'react';

export function useNow() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        let timer;
        const tick = () => {
            setNow(new Date());
            timer = setTimeout(tick, 60000 - (Date.now() % 60000));
        };
        timer = setTimeout(tick, 60000 - (Date.now() % 60000));
        return () => clearTimeout(timer);
    }, []);
    return now;
}