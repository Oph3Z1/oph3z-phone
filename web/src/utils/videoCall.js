// WebRTC video-only peer for FaceTime-style video calls.
//
// Audio + mute stay on the existing pma-voice call; this carries just the
// picture. Signaling (SDP offer/answer + ICE) is relayed through Lua/server by
// callId. Kept as a singleton (not tied to a component) so signals that arrive
// before the video screen mounts are queued, not lost.

let pc = null;
let sendSignal = null;
let onRemote = null;
let pending = []; // signals that arrived before the peer connection existed

function handleSignal(raw) {
  if (!pc) { pending.push(raw); return; }
  let m;
  try { m = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
  if (!m) return;

  if (m.kind === 'offer') {
    pc.setRemoteDescription(m.sdp)
      .then(() => pc.createAnswer())
      .then((ans) => pc.setLocalDescription(ans))
      .then(() => sendSignal && sendSignal(JSON.stringify({ kind: 'answer', sdp: pc.localDescription })))
      .catch((e) => console.error('[videoCall] offer handling failed', e));
  } else if (m.kind === 'answer') {
    pc.setRemoteDescription(m.sdp).catch((e) => console.error('[videoCall] answer failed', e));
  } else if (m.kind === 'ice' && m.candidate) {
    pc.addIceCandidate(m.candidate).catch(() => { /* late/duplicate candidate */ });
  }
}

// Called by the video screen once it has the local canvas stream. `role` decides
// who makes the WebRTC offer (the initiator); the other side answers.
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
  pc.ontrack = (e) => { if (onRemote && e.streams && e.streams[0]) onRemote(e.streams[0]); };
  pc.onicecandidate = (e) => {
    if (e.candidate && sendSignal) sendSignal(JSON.stringify({ kind: 'ice', candidate: e.candidate }));
  };

  if (role === 'offer') {
    pc.createOffer({ offerToReceiveVideo: true })
      .then((off) => pc.setLocalDescription(off))
      .then(() => sendSignal && sendSignal(JSON.stringify({ kind: 'offer', sdp: pc.localDescription })))
      .catch((e) => console.error('[videoCall] offer failed', e));
  }

  // Process anything that arrived before we were ready.
  const q = pending;
  pending = [];
  q.forEach(handleSignal);
}

export function onVideoSignal(blob) {
  handleSignal(blob);
}

export function stopVideoCall() {
  if (pc) {
    try { pc.ontrack = null; pc.onicecandidate = null; pc.close(); } catch (e) { /* ignore */ }
    pc = null;
  }
  pending = [];
  sendSignal = null;
  onRemote = null;
}
