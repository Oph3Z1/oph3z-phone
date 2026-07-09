import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './CallScreen.css';
import Avatar from '../components/Avatar';
import { PhoneIcon, MicIcon, MicOffIcon, VideoIcon, SpeakerIcon } from '../components/icons';
import { fetchNui } from '../../../utils/fetchNui';
import { setMuted, setSpeaker, setVideoReq } from '../../../store/slices/callSlice';
import { getWallpaper } from '../../../config/phone.config';
import { useT } from '../../../i18n/useT';

const REASON_KEY = {
  unavailable: 'call.reasonUnavailable',
  busy: 'call.reasonBusy',
  invalid: 'call.reasonInvalid',
  declined: 'call.reasonDeclined',
  noanswer: 'call.reasonNoAnswer',
  hangup: 'call.reasonEnded',
  airplane: 'call.reasonAirplane',
};

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function CallScreen() {
  const dispatch = useDispatch();
  const t = useT();
  const call = useSelector((s) => s.call);
  const wallpaperKey = useSelector((s) => s.settings.wallpaper);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (call.state !== 'active' || !call.answeredAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [call.state, call.answeredAt]);

  const title = call.name || call.number || t('call.unknown');

  let status = '';
  if (call.state === 'outgoing') status = call.wantsVideo ? t('call.callingVideo') : t('call.calling');
  else if (call.state === 'active') status = fmt(elapsed);
  else if (call.state === 'incoming') status = call.wantsVideo ? t('call.incomingVideo') : t('call.incoming');
  else if (call.state === 'ended') status = t(REASON_KEY[call.reason] || 'call.reasonEnded');
  else if (call.state === 'failed') status = t(REASON_KEY[call.reason] || 'call.reasonFailed');

  const hangup = () => fetchNui('phone:call:hangup', { callId: call.callId }, {});
  const accept = () => fetchNui('phone:call:accept', { callId: call.callId }, {});
  const decline = () => fetchNui('phone:call:decline', { callId: call.callId }, {});
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
  const requestVideo = () => fetchNui('phone:video:request', { callId: call.callId }, {});
  const acceptVideo = () => fetchNui('phone:video:accept', { callId: call.videoReq }, {});
  const declineVideo = () => {
    fetchNui('phone:video:decline', { callId: call.videoReq }, {});
    dispatch(setVideoReq(null));
  };

  const finished = call.state === 'ended' || call.state === 'failed';

  return (
    <div className="callscreen">
      <img className="callscreen__wall" src={getWallpaper(wallpaperKey)} alt="" />
      <div className="callscreen__scrim" />

      <div className="callscreen__top">
        <div className="callscreen__status">{status}</div>
        <div className="callscreen__name">{title}</div>
        {call.name ? <div className="callscreen__sub">{call.number}</div> : null}
      </div>

      {call.name ? (
        <div className="callscreen__avatar">
          <Avatar name={call.name} img={call.img} size="7em" />
        </div>
      ) : null}

      <div className="callscreen__actions">
        {call.state === 'incoming' ? (
          <>
            <button className="cs-btn cs-btn--end" onClick={decline} aria-label="Decline">
              <PhoneIcon />
              <span>{t('call.decline')}</span>
            </button>
            <button className="cs-btn cs-btn--accept" onClick={accept} aria-label="Accept">
              <PhoneIcon />
              <span>{t('call.accept')}</span>
            </button>
          </>
        ) : finished ? null : (
          <div className="cs-controls">
            <div className="cs-controls__row">
              <button
                className={`cs-btn cs-btn--mute${call.muted ? ' is-on' : ''}`}
                onClick={toggleMute}
                aria-label="Mute"
              >
                {call.muted ? <MicOffIcon /> : <MicIcon />}
                <span>{call.muted ? t('call.unmute') : t('call.mute')}</span>
              </button>
              <button
                className={`cs-btn cs-btn--speaker${call.speaker ? ' is-on' : ''}`}
                onClick={toggleSpeaker}
                aria-label={t('call.speaker')}
              >
                <SpeakerIcon />
                <span>{t('call.speaker')}</span>
              </button>
              {call.state === 'active' && (
                <button className="cs-btn cs-btn--video" onClick={requestVideo} aria-label={t('call.video')}>
                  <VideoIcon />
                  <span>{t('call.video')}</span>
                </button>
              )}
            </div>
            <button className="cs-btn cs-btn--end" onClick={hangup} aria-label="End">
              <PhoneIcon />
              <span>{t('call.end')}</span>
            </button>
          </div>
        )}
      </div>

      {call.videoReq ? (
        <div className="cs-videoreq">
          <span className="cs-videoreq__text">{t('call.videoRequest')}</span>
          <div className="cs-videoreq__btns">
            <button className="cs-videoreq__decline" onClick={declineVideo}>{t('call.decline')}</button>
            <button className="cs-videoreq__accept" onClick={acceptVideo}>{t('call.accept')}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
