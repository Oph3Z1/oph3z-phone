import { isEnvBrowser } from './misc';

function getResourceName() {
    return window.GetParentResourceName ? window.GetParentResourceName() : 'oph3z-phone';
}

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
        return undefined;
    }
}