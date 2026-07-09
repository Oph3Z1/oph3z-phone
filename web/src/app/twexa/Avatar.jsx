import { initialOf } from './xUtil';

export default function Avatar({ account, size = '2.6em', onClick, className = '' }) {
    const style = { width: size, height: size };
    const clickable = typeof onClick === 'function';
    return (
        <span
            className={`x-avatar${clickable ? ' is-clickable' : ''} ${className}`}
            style={style}
            onClick={
                clickable
                    ? (e) => {
                          e.stopPropagation();
                          onClick();
                      }
                    : undefined
            }
        >
            {account && account.avatar ? (
                <img src={account.avatar} alt="" />
            ) : (
                <span className="x-avatar__fallback">{initialOf(account && account.name)}</span>
            )}
        </span>
    );
}