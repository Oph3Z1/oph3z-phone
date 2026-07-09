import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { openShare } from '../../store/slices/airdropSlice';
import { sendMessage } from '../../store/slices/messagesSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import ContactPickerSheet from '../wallet/ContactPickerSheet';
import { gradientFor } from './util';
import { ShareIcon, NoteIcon } from './icons';

export default function ShareSheet({ track, onClose }) {
    const t = useT();
    const dispatch = useDispatch();
    const [picking, setPicking] = useState(false);
    if (!track) return null;

    const doAirdrop = () => {
        dispatch(
            openShare({
                kind: 'app',
                app: {
                    id: 'music',
                    title: `${track.title} · ${track.artist || ''}`.trim(),
                    icon: track.artwork || null,
                    payload: { track },
                    preview: track.artwork || null,
                },
            }),
        );
        onClose();
    };
    const toContact = (contact) => {
        dispatch(
            sendMessage(contact.number, {
                type: 'appshare',
                body: `${track.title} — ${track.artist || ''}`.trim(),
                meta: {
                    appId: 'music',
                    title: track.title,
                    subtitle: track.artist || '',
                    image: track.artwork || null,
                    data: { track },
                },
            }),
        );
        dispatch(pushToast({ title: t('spotify.sharedWith', { name: contact.name }), body: '' }));
        onClose();
    };

    if (picking) return <ContactPickerSheet onClose={() => setPicking(false)} onPick={toContact} />;

    return (
        <div className="sp-sheet" onClick={onClose}>
            <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <button
                    className="sp-sheet__griphit"
                    onClick={onClose}
                    aria-label={t('common.close')}
                >
                    <span className="sp-sheet__grip" />
                </button>
                <div className="sp-sheet__track">
                    <span
                        className="sp-sheet__tart"
                        style={
                            track.artwork
                                ? { backgroundImage: `url(${track.artwork})` }
                                : { background: gradientFor(track.title) }
                        }
                    >
                        {!track.artwork && <NoteIcon size={20} />}
                    </span>
                    <div className="sp-sheet__tmeta">
                        <div className="sp-sheet__ttitle">{track.title}</div>
                        <div className="sp-sheet__tartist">{track.artist || '—'}</div>
                    </div>
                </div>
                <button className="sp-item" onClick={doAirdrop}>
                    <ShareIcon size={19} /> {t('spotify.shareAirdrop')}
                </button>
                <button className="sp-item" onClick={() => setPicking(true)}>
                    <ShareIcon size={19} /> {t('spotify.shareMessages')}
                </button>
            </div>
        </div>
    );
}