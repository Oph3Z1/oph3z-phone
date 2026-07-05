import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './WalletApp.css';

import { useT } from '../../i18n/useT';
import { loadWallet, selectUnpaidCount } from '../../store/slices/walletSlice';
import { clearNotifsFor } from '../../store/slices/notificationsSlice';
import { fmtMoney } from './walletUtil';
import TxRow from './TxRow';
import SendMoney from './SendMoney';
import Transactions from './Transactions';
import Bills from './Bills';
import { SendIcon, BillIcon, ChevronRight } from './icons';

export default function WalletApp() {
  const dispatch = useDispatch();
  const t = useT();
  const loaded = useSelector((s) => s.wallet.loaded);
  const balance = useSelector((s) => s.wallet.balance);
  const serverId = useSelector((s) => s.wallet.serverId);
  const transactions = useSelector((s) => s.wallet.transactions);
  const unpaid = useSelector(selectUnpaidCount);

  const [view, setView] = useState('home'); // home | send | tx | bills

  useEffect(() => {
    if (!loaded) dispatch(loadWallet());
    dispatch(clearNotifsFor({ app: 'wallet' })); // opening the wallet clears its notifications
  }, [loaded, dispatch]);

  if (view === 'send') {
    return <SendMoney onClose={() => setView('home')} onSent={() => setView('home')} />;
  }
  if (view === 'tx') return <Transactions onClose={() => setView('home')} />;
  if (view === 'bills') return <Bills onClose={() => setView('home')} />;

  const recent = transactions.slice(0, 4);

  return (
    <div className="walletapp">
      <div className="wl-head">
        <h1 className="wl-head__title">{t('wallet.title')}</h1>
      </div>

      <div className="wl-scroll">
        {/* Balance card */}
        <div className="wl-card">
          <div className="wl-card__glow" />
          <span className="wl-card__label">{t('wallet.bankBalance')}</span>
          <span className="wl-card__amt">{fmtMoney(balance)}</span>
          <div className="wl-card__row">
            <span className="wl-card__dots">ID · {serverId ?? '—'}</span>
            <span className="wl-card__brand">BANK</span>
          </div>
        </div>

        {/* Actions */}
        <div className="wl-actions">
          <button className="wl-act wl-act--primary" onClick={() => setView('send')}>
            <span className="wl-act__ic"><SendIcon /></span>
            <span>{t('wallet.send')}</span>
          </button>
          <button className="wl-act" onClick={() => setView('bills')}>
            <span className="wl-act__ic">
              <BillIcon />
              {unpaid > 0 && <span className="wl-act__badge">{unpaid}</span>}
            </span>
            <span>{t('wallet.bills')}</span>
          </button>
        </div>

        {/* Recent transactions */}
        <div className="wl-recenthead">
          <span>{t('wallet.recent')}</span>
          {transactions.length > 0 && (
            <button className="wl-seeall" onClick={() => setView('tx')}>
              {t('wallet.seeAll')} <ChevronRight />
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="wl-empty">{t('wallet.noTransactions')}</div>
        ) : (
          <div className="wl-list">
            {recent.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
