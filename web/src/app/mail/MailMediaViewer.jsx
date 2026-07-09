import VideoPlayer from '../photos/components/VideoPlayer';
import { CloseIcon } from './icons';

export default function MailMediaViewer({ item, onClose }) {
    return (
        <div className="mail-viewer">
            <div className="mail-viewer__bar">
                <button className="mail-viewer__close" onClick={onClose} aria-label="Close">
                    <CloseIcon />
                </button>
            </div>
            <div className="mail-viewer__stage">
                {item.type === 'video' ? (
                    <VideoPlayer src={item.url} poster={item.thumb} />
                ) : (
                    <img className="mail-viewer__img" src={item.url} alt="" />
                )}
            </div>
        </div>
    );
}