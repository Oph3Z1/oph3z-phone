let pc = null;
let sendSignal = null;
let onRemote = null;
let pending = [];

function handleSignal(raw) {
    if (!pc) {
        pending.push(raw);
        return;
    }
    let m;
    try {
        m = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        return;
    }
    if (!m) return;

    if (m.kind === 'offer') {
        pc.setRemoteDescription(m.sdp)
            .then(() => pc.createAnswer())
            .then((ans) => pc.setLocalDescription(ans))
            .then(
                () =>
                    sendSignal &&
                    sendSignal(JSON.stringify({ kind: 'answer', sdp: pc.localDescription })),
            )
            .catch((e) => console.error('[videoCall] offer handling failed', e));
    } else if (m.kind === 'answer') {
        pc.setRemoteDescription(m.sdp).catch((e) => console.error('[videoCall] answer failed', e));
    } else if (m.kind === 'ice' && m.candidate) {
        pc.addIceCandidate(m.candidate).catch(() => {});
    }
}

export function startVideoCall({ ice, role, localStream, onRemoteStream, send }) {
    stopVideoCall();
    sendSignal = send;
    onRemote = onRemoteStream;

    try {
        pc = new RTCPeerConnection({ iceServers: Array.isArray(ice) ? ice : [] });
    } catch (e) {
        console.error('[videoCall] RTCPeerConnection unavailable', e);
        return;
    }

    if (localStream) {
        localStream.getVideoTracks().forEach((tr) => pc.addTrack(tr, localStream));
    }
    pc.ontrack = (e) => {
        if (onRemote && e.streams && e.streams[0]) onRemote(e.streams[0]);
    };
    pc.onicecandidate = (e) => {
        if (e.candidate && sendSignal)
            sendSignal(JSON.stringify({ kind: 'ice', candidate: e.candidate }));
    };

    if (role === 'offer') {
        pc.createOffer({ offerToReceiveVideo: true })
            .then((off) => pc.setLocalDescription(off))
            .then(
                () =>
                    sendSignal &&
                    sendSignal(JSON.stringify({ kind: 'offer', sdp: pc.localDescription })),
            )
            .catch((e) => console.error('[videoCall] offer failed', e));
    }

    const q = pending;
    pending = [];
    q.forEach(handleSignal);
}

export function onVideoSignal(blob) {
    handleSignal(blob);
}

export function stopVideoCall() {
    if (pc) {
        try {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.close();
        } catch (e) {}
        pc = null;
    }
    pending = [];
    sendSignal = null;
    onRemote = null;
}