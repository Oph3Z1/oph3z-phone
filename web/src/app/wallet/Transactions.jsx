import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { signedMoney, isCredit, fmtNumber, txDateLong } from './walletUtil';
import { ChevronLeft, SearchIcon, ArrowUpRight, ArrowDownLeft, BillIcon } from './icons';

// Detailed row: full name, phone number, description, date + amount.
function DetailRow({ tx }) {
  const credit = isCredit(tx.kind);
  const Icon = tx.kind === 'bill' ? BillIcon : credit ? ArrowUpRight : ArrowDownLeft;
  return (
    <div className="wl-txd">
      <span className={`wl-tx__ico wl-tx__ico--${tx.kind}`}>
        <Icon />
      </span>
      <div className="wl-txd__mid">
        <span className="wl-txd__name">{tx.party || '—'}</span>
        {tx.number ? <span className="wl-txd__num">{fmtNumber(tx.number)}</span> : null}
        {tx.note ? <span className="wl-txd__note">{tx.note}</span> : null}
      </div>
      <div className="wl-txd__right">
        <span className={`wl-txd__amt${credit ? ' is-credit' : ''}`}>{signedMoney(tx.kind, tx.amount)}</span>
        <span className="wl-txd__date">{txDateLong(tx.ts)}</span>
      </div>
    </div>
  );
}

export default function Transactions({ onClose }) {
  const t = useT();
  const txs = useSelector((s) => s.wallet.transactions);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return txs;
    return txs.filter((tx) => {
      const hay = [
        tx.party,
        tx.number,
        fmtNumber(tx.number || ''),
        tx.note,
        String(tx.amount),
        txDateLong(tx.ts),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [txs, q]);

  return (
    <div className="walletapp">
      <div className="wl-bar">
        <button className="wl-bar__back" onClick={onClose}>
          <ChevronLeft />
          <span>{t('wallet.title')}</span>
        </button>
        <span className="wl-bar__title">{t('wallet.transactions')}</span>
        <span className="wl-bar__spacer" />
      </div>

      <div className="wl-scroll">
        <div className="wl-search wl-search--tx">
          <SearchIcon />
          <input value={q} placeholder={t('wallet.searchTx')} onChange={(e) => setQ(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="wl-empty">{q ? t('wallet.noResults') : t('wallet.noTransactions')}</div>
        ) : (
          <div className="wl-list">
            {filtered.map((tx) => (
              <DetailRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
