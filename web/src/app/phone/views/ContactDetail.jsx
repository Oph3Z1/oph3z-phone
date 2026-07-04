import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { ChevronLeftIcon, PhoneIcon } from '../components/icons';
import {
  deleteContact,
  toggleFavorite,
  blockNumber,
  unblockNumber,
  digitsOf,
} from '../../../store/slices/contactsSlice';
import { setResumeThread, setReturnProfile } from '../../../store/slices/messagesSlice';
import { openApp } from '../../../store/slices/phoneSlice';
import { pushToast } from '../../../store/slices/toastSlice';
import { openShare } from '../../../store/slices/airdropSlice';
import { fetchNui } from '../../../utils/fetchNui';
import { copyText } from '../../../utils/clipboard';
import { useT } from '../../../i18n/useT';

// Small inline message glyph (chat bubble).
const MessageGlyph = (p) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l3.9-2.1c1 .2 2 .4 3.1.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
  </svg>
);
const ShareGlyph = (p) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3v12M12 3L8 7M12 3l4 4" />
    <path d="M5 12v7h14v-7" />
  </svg>
);

export default function ContactDetail({ id, onBack, onEdit, backLabel }) {
  const dispatch = useDispatch();
  const t = useT();
  const contact = useSelector((s) => s.contacts.contacts.find((c) => c.id === id));
  const blocked = useSelector((s) => s.contacts.blocked);
  const isBlocked = contact ? !!blocked[digitsOf(contact.number)] : false;

  // If the contact disappears (deleted), close the detail view.
  useEffect(() => {
    if (!contact) onBack();
  }, [contact, onBack]);

  if (!contact) return null;

  const remove = () => {
    dispatch(deleteContact(contact.id));
    onBack();
  };

  // Open (or start) the Messages conversation with this contact. Backing out of
  // that conversation returns here (to this profile), not to the thread list.
  const openMessages = () => {
    const digits = digitsOf(contact.number);
    dispatch(setResumeThread(digits));
    dispatch(setReturnProfile(digits));
    dispatch(openApp('message'));
  };

  // Tap the number to copy it to the clipboard.
  const copyNumber = async () => {
    const ok = await copyText(contact.number);
    dispatch(pushToast({ app: 'call', title: t('phone.title'), body: ok ? t('phone.numberCopied') : t('phone.copyFailed') }));
  };

  return (
    <div className="pa-detail">
      <div className="pa-detail__nav">
        <button className="pa-actionbtn" onClick={onBack}>
          <ChevronLeftIcon /> {backLabel || t('phone.contacts')}
        </button>
        <button className="pa-actionbtn" onClick={() => onEdit(contact)}>
          {t('phone.edit')}
        </button>
      </div>

      <div className="pa-detail__hero">
        <Avatar name={contact.name} img={contact.img} size="6em" />
        <div className="pa-detail__name">{contact.name}</div>
      </div>

      {/* Call / Message are visual for now (call screen comes later). */}
      <div className="pa-detail__actions">
        <button className="pa-quick" onClick={openMessages}>
          <span className="pa-quick__circle">
            <MessageGlyph />
          </span>
          {t('phone.message')}
        </button>
        <button
          className="pa-quick"
          onClick={() => fetchNui('phone:call:start', { number: contact.number }, {})}
        >
          <span className="pa-quick__circle">
            <PhoneIcon />
          </span>
          {t('phone.call')}
        </button>
        <button
          className="pa-quick"
          onClick={() =>
            dispatch(openShare({ kind: 'contact', contact: { name: contact.name, number: contact.number, img: contact.img } }))
          }
        >
          <span className="pa-quick__circle">
            <ShareGlyph />
          </span>
          {t('phone.share')}
        </button>
      </div>

      <div className="pa-card">
        <button className="pa-card__item pa-card__item--tap" onClick={copyNumber}>
          <div className="pa-card__label">{t('phone.mobile')}</div>
          <div className="pa-card__value pa-card__value--link">{contact.number}</div>
        </button>
        {contact.notes ? (
          <div className="pa-card__item">
            <div className="pa-card__label">{t('phone.notes')}</div>
            <div className="pa-card__value pa-card__value--plain">{contact.notes}</div>
          </div>
        ) : null}
      </div>

      <div className="pa-card">
        <button
          className="pa-card__btn"
          onClick={() => dispatch(toggleFavorite(contact.id, !contact.favorite))}
        >
          {contact.favorite ? t('phone.removeFromFavorites') : t('phone.addToFavorites')}
        </button>
      </div>

      <div className="pa-card">
        <button
          className="pa-card__btn pa-card__btn--danger"
          onClick={() =>
            dispatch(
              isBlocked ? unblockNumber(contact.number) : blockNumber(contact.number)
            )
          }
        >
          {isBlocked ? t('phone.unblockCaller') : t('phone.blockCaller')}
        </button>
      </div>

      <div className="pa-card">
        <button className="pa-card__btn pa-card__btn--danger" onClick={remove}>
          {t('phone.deleteContact')}
        </button>
      </div>
    </div>
  );
}
