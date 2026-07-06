import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { openShare } from '../../store/slices/airdropSlice';
import { sendMessage } from '../../store/slices/messagesSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { copyText } from '../../utils/clipboard';
import { useT } from '../../i18n/useT';
import Avatar from './Avatar';
import ContactPickerSheet from '../wallet/ContactPickerSheet';
import { ShareIcon, LinkIcon } from './icons';

// "Share this profile": AirDrop (nearby), send in Messages, or copy the handle.
export default function ShareProfileSheet({ profile, onClose }) {
  const dispatch = useDispatch();
  const t = useT();
  const [picking, setPicking] = useState(false);

  const xp = { handle: profile.handle, name: profile.name, avatar: profile.avatar };

  const doAirdrop = () => {
    dispatch(openShare({ kind: 'xprofile', xprofile: xp }));
    onClose();
  };

  const doCopy = async () => {
    await copyText(`@${profile.handle}`);
    dispatch(pushToast({ title: t('x.copied'), body: '' }));
    onClose();
  };

  const sendToContact = (contact) => {
    // Send the profile card into the conversation WITHOUT leaving X — just toast.
    dispatch(sendMessage(contact.number, {
      type: 'appshare',
      body: `@${profile.handle}`,
      meta: {
        appId: 'x',
        title: profile.name,
        subtitle: `@${profile.handle}`,
        image: profile.avatar,
        data: { handle: profile.handle },
      },
    }));
    dispatch(pushToast({ title: t('x.profileSharedWith', { name: contact.name }), body: '' }));
    onClose();
  };

  if (picking) {
    return <ContactPickerSheet onClose={() => setPicking(false)} onPick={sendToContact} />;
  }

  return (
    <div className="x-sheet" onClick={onClose}>
      <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="x-share__head">
          <Avatar account={profile} size="2.6em" />
          <div className="x-share__id">
            <div className="x-share__name">{profile.name}</div>
            <div className="x-share__handle">@{profile.handle}</div>
          </div>
        </div>

        <div className="x-sheet__actions x-sheet__actions--col">
          <button className="x-sheet__btn x-sheet__btn--row" onClick={doAirdrop}><ShareIcon size={18} /> {t('x.shareAirdrop')}</button>
          <button className="x-sheet__btn x-sheet__btn--row" onClick={() => setPicking(true)}><ShareIcon size={18} /> {t('x.shareMessages')}</button>
          <button className="x-sheet__btn x-sheet__btn--row" onClick={doCopy}><LinkIcon size={18} /> {t('x.copyHandle')}</button>
          <button className="x-sheet__btn" onClick={onClose}>{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
