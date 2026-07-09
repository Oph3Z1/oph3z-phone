import { tokenize } from './xUtil';
import { useXNav } from './XNav';

export default function RichText({ text, className = '' }) {
    const nav = useXNav();
    const tokens = tokenize(text);
    return (
        <span className={`x-rich ${className}`}>
            {tokens.map((tk, i) => {
                if (tk.type === 'mention') {
                    return (
                        <button
                            key={i}
                            className="x-link"
                            onClick={(e) => {
                                e.stopPropagation();
                                nav.openProfile && nav.openProfile({ handle: tk.handle });
                            }}
                        >
                            {tk.value}
                        </button>
                    );
                }
                if (tk.type === 'hashtag') {
                    return (
                        <button
                            key={i}
                            className="x-link"
                            onClick={(e) => {
                                e.stopPropagation();
                                nav.openHashtag && nav.openHashtag(tk.tag);
                            }}
                        >
                            {tk.value}
                        </button>
                    );
                }
                if (tk.type === 'url') {
                    return (
                        <span key={i} className="x-link">
                            {tk.value}
                        </span>
                    );
                }
                return <span key={i}>{tk.value}</span>;
            })}
        </span>
    );
}