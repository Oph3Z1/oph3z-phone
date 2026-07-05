import { signedMoney, isCredit, txDate } from './walletUtil';
import { ArrowUpRight, ArrowDownLeft, BillIcon } from './icons';

// A single transaction row (shared by the overview + the Transactions screen).
export default function TxRow({ tx }) {
  const credit = isCredit(tx.kind);
  const Icon = tx.kind === 'bill' ? BillIcon : credit ? ArrowUpRight : ArrowDownLeft;
  const subtitle = tx.note || (tx.kind === 'bill' ? 'Bill' : credit ? 'Received' : 'Sent');

  return (
    <div className="wl-tx">
      <span className={`wl-tx__ico wl-tx__ico--${tx.kind}`}>
        <Icon />
      </span>
      <div className="wl-tx__mid">
        <span className="wl-tx__party">{tx.party || '—'}</span>
        <span className="wl-tx__sub">{subtitle} · {txDate(tx.ts)}</span>
      </div>
      <span className={`wl-tx__amt${credit ? ' is-credit' : ''}`}>{signedMoney(tx.kind, tx.amount)}</span>
    </div>
  );
}
