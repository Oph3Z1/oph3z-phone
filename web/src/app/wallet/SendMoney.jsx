import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { sendMoney } from '../../store/slices/walletSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { fmtMoney, digitsOf, initialOf } from './walletUtil';
import { ChevronLeft, SearchIcon, PeopleIcon, IdIcon } from './icons';
import ContactPickerSheet from './ContactPickerSheet';

export default function SendMoney({ onClose, onSent, prefill }) {
  const dispatch = useDispatch();
  const t = useT();
  const balance = useSelector((s) => s.wallet.balance);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState(''); // number or server id only — contacts use the picker
  const [recipient, setRecipient] = useState(prefill || null); // { number,name,img } | { serverId,name }
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);

  const rawDigits = digitsOf(query);
  const amt = Math.floor(Number(amount) || 0);
  const canSend =
    !!recipient && (recipient.serverId != null || digitsOf(recipient.number || '')) && amt > 0 && amt <= balance && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    const payload = { amount: amt, note: note.trim() };
    if (recipient.serverId != null) payload.toId = recipient.serverId;
    else payload.to = digitsOf(recipient.number);
    const res = await dispatch(sendMoney(payload));
    setSending(false);
    if (res && res.ok) {
      dispatch(pushToast({ app: 'wallet', title: t('wallet.sentToast', { amount: fmtMoney(amt) }) }));
      onSent();
    } else {
      const reason =
        res && res.reason === 'notfound' ? t('wallet.noSuchNumber')
          : res && res.reason === 'funds' ? t('wallet.insufficient')
          : res && res.reason === 'self' ? t('wallet.cantSelf')
          : t('wallet.sendFailed');
      dispatch(pushToast({ app: 'wallet', type: 'error', title: reason }));
    }
  };

  const recipTitle = recipient
    ? recipient.serverId != null
      ? `${t('wallet.serverId')} ${recipient.serverId}`
      : recipient.name || recipient.number
    : '';

  return (
    <div className="walletapp">
      <div className="wl-bar">
        <button className="wl-bar__back" onClick={onClose}>
          <ChevronLeft />
          <span>{t('common.cancel')}</span>
        </button>
        <span className="wl-bar__title">{t('wallet.send')}</span>
        <span className="wl-bar__spacer" />
      </div>

      <div className="wl-scroll">
        {/* Amount */}
        <div className="wl-amount">
          <span className="wl-amount__cur">$</span>
          <input
            className="wl-amount__in"
            inputMode="numeric"
            value={amount}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 9))}
            autoFocus
          />
        </div>
        <div className={`wl-avail${amt > balance ? ' is-over' : ''}`}>
          {t('wallet.available')} {fmtMoney(balance)}
        </div>

        {/* Recipient */}
        <div className="wl-section">{t('wallet.to')}</div>
        {recipient ? (
          <div className="wl-chip">
            <span className="wl-chip__av">
              {recipient.serverId != null ? '#' : initialOf(recipient.name || recipient.number)}
            </span>
            <div className="wl-chip__txt">
              <span className="wl-chip__name">{recipTitle}</span>
              {recipient.serverId == null && recipient.name && (
                <span className="wl-chip__num">{recipient.number}</span>
              )}
            </div>
            <button className="wl-chip__x" onClick={() => setRecipient(null)}>✕</button>
          </div>
        ) : (
          <>
            <div className="wl-torow">
              <div className="wl-search">
                <SearchIcon />
                <input
                  value={query}
                  inputMode="numeric"
                  placeholder={t('wallet.numberOrId')}
                  onChange={(e) => setQuery(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <button className="wl-pickbtn" onClick={() => setPicking(true)} aria-label={t('wallet.chooseContact')}>
                <PeopleIcon />
              </button>
            </div>

            {rawDigits.length >= 1 && (
              <div className="wl-suggest">
                {rawDigits.length >= 4 && (
                  <button
                    className="wl-suggest__row"
                    onClick={() => { setRecipient({ number: rawDigits, name: null }); setQuery(''); }}
                  >
                    <span className="wl-suggest__av wl-suggest__av--num">#</span>
                    <div className="wl-suggest__txt">
                      <span className="wl-suggest__name">{t('wallet.sendToNumber')}</span>
                      <span className="wl-suggest__num">{rawDigits}</span>
                    </div>
                  </button>
                )}
                {rawDigits.length <= 5 && (
                  <button
                    className="wl-suggest__row"
                    onClick={() => { setRecipient({ serverId: Number(rawDigits) }); setQuery(''); }}
                  >
                    <span className="wl-suggest__av wl-suggest__av--id"><IdIcon /></span>
                    <div className="wl-suggest__txt">
                      <span className="wl-suggest__name">{t('wallet.sendToId')}</span>
                      <span className="wl-suggest__num">{t('wallet.serverId')} {rawDigits}</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Note */}
        <div className="wl-section">{t('wallet.noteOptional')}</div>
        <input
          className="wl-note"
          value={note}
          maxLength={80}
          placeholder={t('wallet.notePlaceholder')}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="wl-foot">
        <button className={`wl-send${canSend ? '' : ' is-off'}`} onClick={submit} disabled={!canSend}>
          {amt > 0 ? t('wallet.sendAmount', { amount: fmtMoney(amt) }) : t('wallet.send')}
        </button>
      </div>

      {picking && (
        <ContactPickerSheet
          onClose={() => setPicking(false)}
          onPick={(r) => { setRecipient(r); setPicking(false); setQuery(''); }}
        />
      )}
    </div>
  );
}
