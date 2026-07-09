import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Airdrop.css';
import Avatar from '../../app/phone/components/Avatar';
import { AirDropGlyph } from './airdropShared';
import { scanNearby, sendShare, closeShare } from '../../store/slices/airdropSlice';
import { useT } from '../../i18n/useT';

const CheckIcon = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M5 13l4 4L19 7" />
    </svg>
);
const XMarkIcon = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden
    >
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

export default function AirdropPicker() {
    const dispatch = useDispatch();
    const t = useT();
    const share = useSelector((s) => s.airdrop.share);
    const nearby = useSelector((s) => s.airdrop.nearby);
    const scanning = useSelector((s) => s.airdrop.scanning);
    const sendTo = useSelector((s) => s.airdrop.sendTo);
    const sendState = useSelector((s) => s.airdrop.sendState);

    useEffect(() => {
        if (!share) return undefined;
        dispatch(scanNearby());
        const iv = setInterval(() => {
            if (!sendTo) dispatch(scanNearby());
        }, 3000);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [share, sendTo]);

    useEffect(() => {
        if (sendState === 'accepted') {
            const to = setTimeout(() => dispatch(closeShare()), 1100);
            return () => clearTimeout(to);
        }
        return undefined;
    }, [sendState, dispatch]);

    if (!share) return null;

    const busy = sendState === 'sending' || sendState === 'waiting';
    const failed = sendState === 'failed' || sendState === 'range' || sendState === 'off';

    const rowStatus = (person) => {
        if (!sendTo || sendTo.id !== person.id) return null;
        if (sendState === 'accepted')
            return (
                <span className="ad-person__status is-accepted">
                    <CheckIcon />
                </span>
            );
        if (sendState === 'declined')
            return (
                <span className="ad-person__status is-declined">
                    <XMarkIcon />
                </span>
            );
        if (failed)
            return <span className="ad-person__status is-declined">{t('airdrop.failed')}</span>;
        return (
            <span className="ad-person__status is-sent">
                <CheckIcon /> {t('airdrop.sent')}
            </span>
        );
    };

    return (
        <>
            <div className="ad-sheet-backdrop" onClick={() => dispatch(closeShare())} />
            <div className="ad-sheet">
                <div className="ad-sheet__head">
                    <span className="ad-sheet__icon">
                        <AirDropGlyph />
                    </span>
                    <span className="ad-sheet__title">{t('airdrop.title')}</span>
                    <button
                        className="ad-sheet__close"
                        onClick={() => dispatch(closeShare())}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {nearby.length === 0 ? (
                    <div className="ad-empty">
                        <div className="ad-empty__glyph">
                            <AirDropGlyph />
                        </div>
                        {scanning ? (
                            <div className="ad-empty__hint">{t('airdrop.searching')}</div>
                        ) : (
                            <>
                                <div className="ad-empty__title">{t('airdrop.noPeople')}</div>
                                <div className="ad-empty__hint">{t('airdrop.noPeopleHint')}</div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="ad-sheet__list">
                        {nearby.map((p) => (
                            <button
                                key={p.id}
                                className="ad-person"
                                disabled={busy}
                                onClick={() => dispatch(sendShare(p))}
                            >
                                <Avatar name={p.name} img={p.avatar} size="2.5em" />
                                <span className="ad-person__name">{p.name}</span>
                                {rowStatus(p)}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}