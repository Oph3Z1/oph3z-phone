import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { loadPhoneState } from '../../store/slices/contactsSlice';
import { digitsOf, initialOf } from './walletUtil';
import { SearchIcon } from './icons';

// Bottom sheet listing the player's contacts to pick a money recipient.
export default function ContactPickerSheet({ onClose, onPick }) {
  const dispatch = useDispatch();
  const t = useT();
  const loaded = useSelector((s) => s.contacts.loaded);
  const contacts = useSelector((s) => s.contacts.contacts);
  const myNumber = useSelector((s) => s.contacts.number);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!loaded) dispatch(loadPhoneState());
  }, [loaded, dispatch]);

  const myDigits = digitsOf(myNumber);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    const qd = digitsOf(q);
    return contacts
      .filter((c) => digitsOf(c.number) !== myDigits)
      .filter((c) => {
        if (!query) return true;
        if (c.name.toLowerCase().includes(query)) return true;
        return qd.length > 0 && digitsOf(c.number).includes(qd); // number match only when digits typed
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, q, myDigits]);

  return (
    <div className="wl-sheet" onClick={onClose}>
      <div className="wl-sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="wl-sheet__bar">
          <span className="wl-sheet__title">{t('wallet.chooseContact')}</span>
          <button className="wl-sheet__done" onClick={onClose}>{t('common.done')}</button>
        </div>

        <div className="wl-sheet__search">
          <SearchIcon />
          <input value={q} placeholder={t('wallet.searchRecipient')} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>

        {list.length === 0 ? (
          <div className="wl-sheet__empty">{t('wallet.noContacts')}</div>
        ) : (
          <div className="wl-sheet__list">
            {list.map((c) => (
              <button
                key={c.id}
                className="wl-suggest__row"
                onClick={() => onPick({ number: c.number, name: c.name, img: c.img })}
              >
                <span className="wl-suggest__av">{initialOf(c.name)}</span>
                <div className="wl-suggest__txt">
                  <span className="wl-suggest__name">{c.name}</span>
                  <span className="wl-suggest__num">{c.number}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
