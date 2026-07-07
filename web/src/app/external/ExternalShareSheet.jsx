import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { openShare } from '../../store/slices/airdropSlice';
import { sendMessage } from '../../store/slices/messagesSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import ContactPickerSheet from '../wallet/ContactPickerSheet';

// The native "Share" sheet a third-party app opens via the oph3z:share bridge
// message. Offers the same two routes as the built-in apps: AirDrop to a nearby
// player, or send into a Messages conversation as an `appshare` card. Both round
// -trip `item.payload`; on the receiver the app re-opens and gets it back as
// `oph3z:airdrop:received`.
const ShareGlyph = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
const MsgGlyph = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.5 8.5 0 0 1-11.9 7.8L4 20.5l1.2-4.9A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);

export default function ExternalShareSheet({ app, item, onClose }) {
  const t = useT();
  const dispatch = useDispatch();
  const [picking, setPicking] = useState(false);

  if (!item) return null;
  const title = item.title || app.label;
  const subtitle = item.subtitle || '';
  const image = item.image || app.icon || null;
  const payload = item.payload;

  const doAirdrop = () => {
    dispatch(openShare({
      kind: 'app',
      app: { id: app.id, title, icon: image, payload, preview: item.image || null },
    }));
    onClose();
  };

  const toContact = (contact) => {
    dispatch(sendMessage(contact.number, {
      type: 'appshare',
      body: title,
      meta: { appId: app.id, title, subtitle, image: item.image || null, data: payload },
    }));
    dispatch(pushToast({ title: t('common.sharedWith', { name: contact.name }), body: '', app: app.id }));
    onClose();
  };

  if (picking) return <ContactPickerSheet onClose={() => setPicking(false)} onPick={toContact} />;

  return (
    <div className="ext-sheet" onClick={onClose}>
      <div className="ext-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="ext-sheet__title">{t('common.share')}</div>

        <div className="ext-sheet__item">
          <span className="ext-sheet__thumb" style={image ? { backgroundImage: `url(${image})` } : undefined} />
          <div className="ext-sheet__meta">
            <div className="ext-sheet__iname">{title}</div>
            {subtitle && <div className="ext-sheet__isub">{subtitle}</div>}
          </div>
        </div>

        <button className="ext-sheet__btn" onClick={doAirdrop}><ShareGlyph /> {t('common.shareAirdrop')}</button>
        <button className="ext-sheet__btn" onClick={() => setPicking(true)}><MsgGlyph /> {t('common.shareMessages')}</button>
        <button className="ext-sheet__btn ext-sheet__btn--cancel" onClick={onClose}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}
