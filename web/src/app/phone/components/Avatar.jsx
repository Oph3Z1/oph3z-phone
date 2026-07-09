import './Avatar.css';

const APPLE_GRAY = '#8e8e93';

export default function Avatar({ name = '', img = '', size = '2.6em' }) {
    const trimmed = name.trim();
    const style = { width: size, height: size };

    if (img) {
        return (
            <span className="avatar" style={style}>
                <img className="avatar__img" src={img} alt="" />
            </span>
        );
    }

    if (!trimmed) {
        return (
            <span className="avatar avatar--letter" style={{ ...style, background: '#48484a' }}>
                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="#c7c7cc">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6z" />
                </svg>
            </span>
        );
    }

    return (
        <span className="avatar avatar--letter" style={{ ...style, background: APPLE_GRAY }}>
            {trimmed[0].toUpperCase()}
        </span>
    );
}