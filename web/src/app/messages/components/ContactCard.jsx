import Avatar from './Avatar';
import { ChevronRightIcon } from './icons';

export default function ContactCard({ msg, onOpen }) {
    const meta = msg.meta || {};
    return (
        <button className="msg-contactcard" onClick={() => onOpen && onOpen(meta)}>
            <Avatar name={meta.name} src={meta.img} className="msg-avatar--md" />
            <div className="msg-contactcard__info">
                <div className="msg-contactcard__name">{meta.name || meta.number}</div>
                <div className="msg-contactcard__num">{meta.number}</div>
            </div>
            <span className="msg-contactcard__chev">
                <ChevronRightIcon />
            </span>
        </button>
    );
}