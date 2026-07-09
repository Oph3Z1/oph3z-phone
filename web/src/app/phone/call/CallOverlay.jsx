import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearCall } from '../../../store/slices/callSlice';
import { useCallAudio } from '../../../hooks/useCallAudio';
import CallScreen from './CallScreen';
import VideoCallScreen from './VideoCallScreen';
import IncomingIsland from './IncomingIsland';

export default function CallOverlay() {
    const dispatch = useDispatch();
    const call = useSelector((s) => s.call);

    useCallAudio(call.state);

    useEffect(() => {
        if (call.state === 'ended' || call.state === 'failed') {
            const id = setTimeout(() => dispatch(clearCall()), 1600);
            return () => clearTimeout(id);
        }
    }, [call.state, dispatch]);

    if (!call.state) return null;
    if (call.state === 'incoming' && call.island) return <IncomingIsland />;
    if (call.video) return <VideoCallScreen />;
    return <CallScreen />;
}