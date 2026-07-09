import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './VideoCallScreen.css';
import { fetchNui } from '../../../utils/fetchNui';
import { setMuted, setSpeaker } from '../../../store/slices/callSlice';
import { startVideoCall, stopVideoCall } from '../../../utils/videoCall';
import { MicIcon, MicOffIcon, PhoneIcon, VideoOffIcon, CamFlipIcon, SpeakerIcon } from '../components/icons';
import { useT } from '../../../i18n/useT';

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function VideoCallScreen() {
  const dispatch = useDispatch();
  const t = useT();
  const call = useSelector((s) => s.call);
  const selfRef = useRef(null);
  const remoteRef = useRef(null);
  const [remoteOn, setRemoteOn] = useState(false);

  const title = call.name || call.number || t('call.unknown');

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!call.answeredAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [call.answeredAt]);

  // Attach the game renderer to the self canvas (the player's cam view), capture
  // it as the outgoing WebRTC track, and start the peer connection.
  useEffect(() => {
    const canvas = selfRef.current;
    let stopped = false;
    let tries = 0;

    const begin = () => {
      if (stopped || !canvas) return;
      const mr = window.MainRender;
      if (mr && canvas) {
        mr.renderToTarget(canvas);
        let localStream = null;
        try { localStream = canvas.captureStream(30); } catch (e) { localStream = null; }
        startVideoCall({
          ice: call.videoIce || [],
          role: call.videoRole || 'answer',
          localStream,
          onRemoteStream: (stream) => {
            if (remoteRef.current) {
              remoteRef.current.srcObject = stream;
              const p = remoteRef.current.play?.();
              if (p && p.catch) p.catch(() => {});
            }
            setRemoteOn(true);
          },
          send: (blob) => fetchNui('phone:video:signal', { callId: call.callId, blob }, {}),
        });
        return;
      }
      if (tries++ < 60) setTimeout(begin, 100);
    };
    begin();

    return () => {
      stopped = true;
      stopVideoCall();
      if (window.MainRender) window.MainRender.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hangup = () => fetchNui('phone:call:hangup', { callId: call.callId }, {});
  const flip = () => fetchNui('phone:video:flip', {}, {});
  const stopVideo = () => fetchNui('phone:video:stop', { callId: call.callId }, {});
  const toggleMute = () => {
    const next = !call.muted;
    dispatch(setMuted(next));
    fetchNui('phone:call:mute', { callId: call.callId, muted: next }, {});
  };
  const toggleSpeaker = () => {
    const next = !call.speaker;
    dispatch(setSpeaker(next));
    fetchNui('phone:call:speaker', { callId: call.callId, on: next }, {});
  };

  return (
    <div className="vcall">
      <video ref={remoteRef} className="vcall__remote" autoPlay playsInline muted />
      {!remoteOn && (
        <div className="vcall__waiting">
          <div className="vcall__wait-name">{title}</div>
          <div className="vcall__wait-status">{t('call.connectingVideo')}</div>
        </div>
      )}

      <div className="vcall__topbar">
        <span className="vcall__name">{title}</span>
        <span className="vcall__timer">{fmt(elapsed)}</span>
      </div>

      <canvas ref={selfRef} className="vcall__self" />

      <div className="vcall__controls">
        <button className="vc-btn" onClick={flip} aria-label={t('call.flip')}>
          <CamFlipIcon />
        </button>
        <button className={`vc-btn${call.muted ? ' is-on' : ''}`} onClick={toggleMute} aria-label={t('call.mute')}>
          {call.muted ? <MicOffIcon /> : <MicIcon />}
        </button>
        <button className={`vc-btn${call.speaker ? ' is-on' : ''}`} onClick={toggleSpeaker} aria-label={t('call.speaker')}>
          <SpeakerIcon />
        </button>
        <button className="vc-btn" onClick={stopVideo} aria-label={t('call.stopVideo')}>
          <VideoOffIcon />
        </button>
        <button className="vc-btn vc-btn--end" onClick={hangup} aria-label={t('call.end')}>
          <PhoneIcon />
        </button>
      </div>
    </div>
  );
}
