import { useEffect, useRef } from 'react';

/**
 * Subscribe to a message sent from Lua via SendNUIMessage.
 *
 * Lua sends: SendNUIMessage({ action = 'name', data = {...} })
 * Usage:     useNuiEvent('name', (data) => { ... })
 *
 * @param {string}   action   - the `action` field to listen for
 * @param {Function} handler  - called with the message `data`
 */
export function useNuiEvent(action, handler) {
  // Keep the latest handler without re-binding the window listener each render.
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
