import { isEnvBrowser } from './misc';

// Resolves the resource name so NUI callbacks hit the right endpoint.
function getResourceName() {
  return window.GetParentResourceName ? window.GetParentResourceName() : 'oph3z-phone';
}

/**
 * POST a message to a Lua NUI callback (RegisterNUICallback).
 *
 * @param {string} eventName  - the callback name registered in Lua
 * @param {any}    [data]     - JSON-serialisable payload
 * @param {any}    [mockData] - value returned instead when running in a browser
 * @returns {Promise<any>}
 */
export async function fetchNui(eventName, data = {}, mockData = undefined) {
  if (isEnvBrowser()) {
    return mockData;
  }

  const resource = getResourceName();

  try {
    const resp = await fetch(`https://${resource}/${eventName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data),
    });
    return await resp.json();
  } catch (err) {
    // Swallow network errors so the UI never crashes on a missing callback.
    return undefined;
  }
}
