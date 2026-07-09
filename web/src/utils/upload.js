export async function uploadToProvider(blob, filename, cfg) {
    if (!cfg || !blob) return null;

    const fd = new FormData();
    let url;
    let headers;
    if (cfg.provider === 'fivemanage') {
        url = cfg.fivemanage && cfg.fivemanage.url;
        headers = { Authorization: cfg.fivemanage && cfg.fivemanage.apiKey };
        fd.append('file', blob, filename);
    } else {
        url = cfg.discord && cfg.discord.webhook;
        if (url && !/wait=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'wait=true';
        fd.append('payload_json', JSON.stringify({ attachments: [{ id: 0, filename }] }));
        fd.append('files[0]', blob, filename);
    }
    if (!url) {
        console.error('[upload] no upload URL — check Config.Camera', cfg);
        return null;
    }

    try {
        const res = await fetch(url, { method: 'POST', headers, body: fd });
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (e) {}

        if (cfg.provider === 'fivemanage') {
            const out = (json && json.data && json.data.url) || (json && json.url) || null;
            if (!out) console.error('[upload] fivemanage response', res.status, text);
            return out;
        }
        const out =
            (json && json.attachments && json.attachments[0] && json.attachments[0].url) || null;
        if (!out) console.error('[upload] discord response', res.status, text);
        return out;
    } catch (e) {
        console.error('[upload] failed', e);
        return null;
    }
}

export function dataURLtoBlob(dataURL) {
    const [head, b64] = dataURL.split(',');
    const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}