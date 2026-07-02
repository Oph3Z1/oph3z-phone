import { useEffect, useState } from 'react';

// Ticking real (device-local) clock. Returns a Date that updates every second,
// re-synced to the top of each second so the minute flips on time.
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timer);
  }, []);
  return now;
}
