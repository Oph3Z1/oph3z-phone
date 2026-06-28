import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearCall } from '../../../store/slices/callSlice';
import { useCallAudio } from '../../../hooks/useCallAudio';
import CallScreen from './CallScreen';
import IncomingIsland from './IncomingIsland';

export default function CallOverlay() {
  const dispatch = useDispatch();
  const call = useSelector((s) => s.call);

  useCallAudio(call.state);

  // Clear the overlay shortly after a call ends/fails.
  useEffect(() => {
    if (call.state === 'ended' || call.state === 'failed') {
      const id = setTimeout(() => dispatch(clearCall()), 1600);
      return () => clearTimeout(id);
    }
  }, [call.state, dispatch]);

  if (!call.state) return null;
  // Compact island only for an incoming call while the phone was already open.
  if (call.state === 'incoming' && call.island) return <IncomingIsland />;
  return <CallScreen />;
}
