import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { openShare } from '../../store/slices/airdropSlice';
import { sendMessage } from '../../store/slices/messagesSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import ContactPickerSheet from '../wallet/ContactPickerSheet';
import { gradientFor } from './util';
import { ShareIcon, NoteIcon } from './icons';

// Share a track over AirDrop (nearby) or into Messages. On the receiver it opens
// Spotify to the track (via airdrop.deliver -> the app consumes it).
export default function ShareSheet({ track, onClose }) {
  const t = useT();
  const dispatch = useDispatch();
  const [picking, setPicking] = useState(false);
  if (!track) return null;

  const doAirdrop = () => {
    dispatch(openShare({
      kind: 'app',
      app: { id: 'spotify', title: `${track.title} · ${track.artist || ''}`.trim(), icon: track.artwork || null, payload: { track }, preview: track.artwork || null },
    }));
    onClose();
  };

  const toContact = (contact) => {
    dispatch(sendMessage(contact.number, {
      type: 'appshare',
      body: `${track.title} — ${track.artist || ''}`.trim(),
      meta: { appId: 'spotify', title: track.title, subtitle: track.artist || '', image: track.artwork || null, data: { track } },
    }));
    dispatch(pushToast({ title: t('spotify.sharedWith', { name: contact.name }), body: '' }));
    onClose();
  };

  if (picking) return <ContactPickerSheet onClose={() => setPicking(false)} onPick={toContact} />;

  return (
    <div className="sp-sheet" onClick={onClose}>
      <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sp-share__head">
          <span className="sp-share__art" style={track.artwork ? undefined : { background: gradientFor(track.title) }}>
            {track.artwork ? <img src={track.artwork} alt="" /> : <NoteIcon size={20} />}
          </span>
          <div className="sp-share__meta">
            <div className="sp-share__title">{track.title}</div>
            <div className="sp-share__artist">{track.artist || '—'}</div>
          </div>
        </div>
        <button className="sp-sheet__item" onClick={doAirdrop}><ShareIcon size={19} /> {t('spotify.shareAirdrop')}</button>
        <button className="sp-sheet__item" onClick={() => setPicking(true)}><ShareIcon size={19} /> {t('spotify.shareMessages')}</button>
        <button className="sp-sheet__btn" onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
