import { useSelector } from 'react-redux';
import './IncomingIsland.css';
import Avatar from '../components/Avatar';
import { PhoneIcon, VideoIcon } from '../components/icons';
import { fetchNui } from '../../../utils/fetchNui';

export default function IncomingIsland() {
    const call = useSelector((s) => s.call);

    const accept = () => fetchNui('phone:call:accept', { callId: call.callId }, {});
    const decline = () => fetchNui('phone:call:decline', { callId: call.callId }, {});

    return (
        <div className="island">
            <div className="island__left">
                <Avatar name={call.name} img={call.img} size="2.4em" />
                <div className="island__info">
                    <div className="island__sub">{call.wantsVideo ? 'FaceTime' : 'mobile'}</div>
                    <div className="island__name">{call.name || call.number}</div>
                </div>
            </div>
            <div className="island__actions">
                <button
                    className="island__btn island__btn--decline"
                    onClick={decline}
                    aria-label="Decline"
                >
                    <PhoneIcon />
                </button>
                <button
                    className="island__btn island__btn--accept"
                    onClick={accept}
                    aria-label="Accept"
                >
                    {call.wantsVideo ? <VideoIcon /> : <PhoneIcon />}
                </button>
            </div>
        </div>
    );
}