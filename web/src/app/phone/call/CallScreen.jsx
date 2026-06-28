import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './CallScreen.css';
import Avatar from '../components/Avatar';
import { PhoneIcon, MicIcon, MicOffIcon } from '../components/icons';
import { fetchNui } from '../../../utils/fetchNui';
import { setMuted } from '../../../store/slices/callSlice';

const REASON_TEXT = {
  unavailable: 'Unavailable',
  busy: 'Busy',
  invalid: 'Invalid Number',
  declined: 'Call Declined',
  noanswer: 'No Answer',
  hangup: 'Call Ended',
  airplane: 'No Service',
};

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function CallScreen() {
  const dispatch = useDispatch();
  const call = useSelector((s) => s.call);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (call.state !== 'active' || !call.answeredAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [call.state, call.answeredAt]);

  const title = call.name || call.number || 'Unknown';

  let status = '';
  if (call.state === 'outgoing') status = 'Calling…';
  else if (call.state === 'active') status = fmt(elapsed);
  else if (call.state === 'incoming') status = 'Incoming call';
  else if (call.state === 'ended') status = REASON_TEXT[call.reason] || 'Call Ended';
  else if (call.state === 'failed') status = REASON_TEXT[call.reason] || 'Call Failed';

  const hangup = () => fetchNui('phone:call:hangup', { callId: call.callId }, {});
  const accept = () => fetchNui('phone:call:accept', { callId: call.callId }, {});
  const decline = () => fetchNui('phone:call:decline', { callId: call.callId }, {});
  const toggleMute = () => {
    const next = !call.muted;
    dispatch(setMuted(next));
    fetchNui('phone:call:mute', { callId: call.callId, muted: next }, {});
  };

  const finished = call.state === 'ended' || call.state === 'failed';

  return (
    <div className="callscreen">
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
              <span>Decline</span>
            </button>
            <button className="cs-btn cs-btn--accept" onClick={accept} aria-label="Accept">
              <PhoneIcon />
              <span>Accept</span>
            </button>
          </>
        ) : finished ? null : (
          <>
            <button
              className={`cs-btn cs-btn--mute${call.muted ? ' is-on' : ''}`}
              onClick={toggleMute}
              aria-label="Mute"
            >
              {call.muted ? <MicOffIcon /> : <MicIcon />}
              <span>{call.muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button className="cs-btn cs-btn--end" onClick={hangup} aria-label="End">
              <PhoneIcon />
              <span>End</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
