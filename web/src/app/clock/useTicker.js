import { useEffect, useState } from 'react';

// Re-render on an interval while `active`, returning a fresh Date.now() each tick.
// Used to animate the timer countdown / stopwatch without pushing churn into Redux.
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
